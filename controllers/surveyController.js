const {response} = require('express');
const SurveyResponse = require("../model/surveyresponse");
const Survey = require("../model/surveys");
const SurveyQuestion = require("../model/surveyquestion");
const { Op } = require('sequelize');
const sequelize = require('../db/config');



const addSentRecord = async (surveyResponseId) => {
    const surveyResponse = await SurveyResponse.findByPk(surveyResponseId);
    
    if (surveyResponse) {
        const currentSentAt = surveyResponse.sentAt || [];
        const newSentRecord = {
            date: new Date().toISOString(),
            attempt: currentSentAt.length + 1
        };
        
        currentSentAt.push(newSentRecord);
        
        await surveyResponse.update({
            sentAt: currentSentAt,
            totalSentCount: currentSentAt.length
        });
        
        return surveyResponse;
    }
    
    return null;
};

const getSentHistory = (surveyResponse) => {
    return {
        totalSent: surveyResponse.totalSentCount,
        firstSent: surveyResponse.sentAt[0]?.date || null,
        lastSent: surveyResponse.sentAt[surveyResponse.sentAt.length - 1]?.date || null,
        allSentDates: surveyResponse.sentAt
    };
};

const sendSurveyToTicket = async (surveyId, ticketId, applicantId) => {
    const surveyResponse = await SurveyResponse.create({
        IdSurvey: surveyId,
        IdTicket: ticketId,
        IdApplicant: applicantId,
        status: 'sent',
        sentAt: [{
            date: new Date().toISOString(),
            attempt: 1
        }],
        totalSentCount: 1,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
    });
    
    return surveyResponse;
};

// Enviar encuesta a múltiples tickets (actualizado con incremento de intentos)
const sendSurveyToTickets = async (req, res = response) => {
    const { surveyId, tickets } = req.body; // tickets debe ser un array de objetos {ticketId, applicantId}
    
    try {
        // Validar parámetros de entrada
        if (!surveyId) {
            return res.status(400).json({
                status: false,
                message: 'surveyId es requerido'
            });
        }
        
        if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
            return res.status(400).json({
                status: false,
                message: 'tickets debe ser un array con al menos un elemento'
            });
        }
        
        // Verificar que la encuesta existe
        const survey = await Survey.findByPk(surveyId);
        if (!survey) {
            return res.status(404).json({
                status: false,
                message: 'La encuesta especificada no existe'
            });
        }
        
        const responses = [];
        const errors = [];
        
        for (const ticket of tickets) {
            try {
                // Validar estructura del objeto ticket
                if (!ticket.ticketId) {
                    errors.push({
                        ticket,
                        error: 'ticketId es requerido'
                    });
                    continue;
                }
                
                // Verificar si ya existe una encuesta para este ticket (sin importar el status)
                let existingResponse = await SurveyResponse.findOne({
                    where: {
                        IdSurvey: surveyId,
                        IdTicket: ticket.ticketId
                    }
                });
                
                if (existingResponse) {
                    // Si ya existe, verificar si está completada
                    if (existingResponse.status === 'completed') {
                        errors.push({
                            ticketId: ticket.ticketId,
                            error: 'No se puede reenviar una encuesta ya completada'
                        });
                        continue;
                    }
                    
                    // Obtener el array actual y crear una copia mutable (MISMA LÓGICA QUE assignSurveyToTicket)
                    const currentSentAt = Array.isArray(existingResponse.sentAt) 
                        ? [...existingResponse.sentAt] 
                        : [];
                    
                    const newSentRecord = {
                        date: new Date().toISOString(),
                        attempt: currentSentAt.length + 1
                    };
                    
                    // Agregar el nuevo registro
                    currentSentAt.push(newSentRecord);
                    
                    console.log(`Ticket ${ticket.ticketId} - Array antes:`, existingResponse.sentAt);
                    console.log(`Ticket ${ticket.ticketId} - Array después:`, currentSentAt);
                    console.log(`Ticket ${ticket.ticketId} - Nuevo intento:`, newSentRecord);
                    
                    await existingResponse.update({
                        sentAt: currentSentAt,
                        totalSentCount: currentSentAt.length,
                        status: 'sent', // Resetear estado si estaba expirado
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Nueva fecha de expiración
                        IdApplicant: ticket.applicantId || existingResponse.IdApplicant // Actualizar applicant si se proporciona
                    });
                    
                    // Recargar para obtener datos actualizados
                    await existingResponse.reload();
                    
                    console.log(`Ticket ${ticket.ticketId} - Array después de actualizar BD:`, existingResponse.sentAt);
                    
                    responses.push({
                        action: 'resent',
                        surveyResponse: existingResponse,
                        newAttempt: newSentRecord
                    });
                    
                } else {
                    // Si no existe, crear una nueva SurveyResponse
                    const surveyResponse = await SurveyResponse.create({
                        IdSurvey: surveyId,
                        IdTicket: ticket.ticketId,
                        IdApplicant: ticket.applicantId || null,
                        status: 'sent',
                        sentAt: [{
                            date: new Date().toISOString(),
                            attempt: 1
                        }],
                        totalSentCount: 1,
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
                    });
                    
                    responses.push({
                        action: 'created',
                        surveyResponse: surveyResponse,
                        newAttempt: {
                            date: new Date().toISOString(),
                            attempt: 1
                        }
                    });
                }
                
            } catch (ticketError) {
                console.error(`Error procesando ticket ${ticket.ticketId}:`, ticketError);
                errors.push({
                    ticketId: ticket.ticketId,
                    error: ticketError.message
                });
            }
        }
        
        // Preparar respuesta
        const responseData = {
            successful: responses,
            errors: errors,
            totalProcessed: tickets.length,
            successCount: responses.length,
            errorCount: errors.length,
            summary: {
                created: responses.filter(r => r.action === 'created').length,
                resent: responses.filter(r => r.action === 'resent').length
            }
        };
        
        if (responses.length > 0 && errors.length === 0) {
            res.status(200).json({
                status: true,
                message: 'Todas las encuestas fueron procesadas exitosamente',
                data: responseData
            });
        } else if (responses.length > 0 && errors.length > 0) {
            res.status(207).json({ // 207 Multi-Status
                status: true,
                message: 'Algunas encuestas fueron procesadas con errores',
                data: responseData
            });
        } else {
            res.status(400).json({
                status: false,
                message: 'No se pudo procesar ninguna encuesta',
                data: responseData
            });
        }
        
    } catch (error) {
        console.error('Error en sendSurveyToTickets:', error);
        res.status(500).json({
            status: false,
            message: 'Error al enviar encuestas',
            error: error.message
        });
    }
};

// Completar una encuesta (actualizado)
const completeSurvey = async (req, res = response) => {
    const { surveyResponseId } = req.params;
    const { answers } = req.body;
    
    try {
        const surveyResponse = await SurveyResponse.findByPk(surveyResponseId);
        
        if (!surveyResponse) {
            return res.status(404).json({
                status: false,
                message: 'Encuesta no encontrada'
            });
        }
        
        // Verificar si no ha expirado
        if (surveyResponse.expiresAt && new Date() > new Date(surveyResponse.expiresAt)) {
            await surveyResponse.update({ status: 'expired' });
            return res.status(400).json({
                status: false,
                message: 'La encuesta ha expirado'
            });
        }
        
        await surveyResponse.update({
            status: 'completed',
            completedAt: new Date(),
            responseData: answers
        });
        
        res.status(200).json({
            status: true,
            message: 'Encuesta completada exitosamente',
            data: surveyResponse.IdSurveyResponse
        });
        
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Error al completar encuesta',
            error: error.message
        });
    }
};

// Reenviar una encuesta
const resendSurvey = async (req, res = response) => {
    const { surveyResponseId } = req.params;
    
    try {
        const surveyResponse = await SurveyResponse.findByPk(surveyResponseId);
        
        if (!surveyResponse) {
            return res.status(404).json({
                status: false,
                message: 'Encuesta no encontrada'
            });
        }
        
        const currentSentAt = surveyResponse.sentAt || [];
        const newSentRecord = {
            date: new Date().toISOString(),
            attempt: currentSentAt.length + 1
        };
        
        currentSentAt.push(newSentRecord);
        
        await surveyResponse.update({
            sentAt: currentSentAt,
            totalSentCount: currentSentAt.length,
            status: 'sent', // Resetear estado si estaba expirado
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Nueva fecha de expiración
        });
        
        res.status(200).json({
            status: true,
            message: 'Encuesta reenviada exitosamente',
            data: surveyResponse
        });
        
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Error al reenviar encuesta',
            error: error.message
        });
    }
};

// Obtener historial de envíos
const getSurveyHistory = async (req, res = response) => {
    const { surveyResponseId } = req.params;
    
    try {
        const surveyResponse = await SurveyResponse.findByPk(surveyResponseId);
        
        if (!surveyResponse) {
            return res.status(404).json({
                status: false,
                message: 'Encuesta no encontrada'
            });
        }
        
        const history = getSentHistory(surveyResponse);
        
        res.status(200).json({
            status: true,
            data: history
        });
        
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Error al obtener historial',
            error: error.message
        });
    }
};


// Obtener survey responses por un ticket
const getSurveyResponsesByTicket = async (req, res = response) => {
    const { ticketId } = req.params;
    
    try {
        const surveyResponses = await SurveyResponse.findAll({
            where: {
                IdTicket: ticketId
            },
            include: [
                {
                    model: Survey,
                    as: 'survey',
                    attributes: ['IdSurvey', 'name', 'description', 'surveyType']
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        
        if (surveyResponses.length === 0) {
            return res.status(404).json({
                status: false,
                message: 'No se encontraron encuestas para este ticket'
            });
        }
        
        res.status(200).json({
            status: true,
            data: surveyResponses,
            count: surveyResponses.length
        });
        
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Error al obtener encuestas del ticket',
            error: error.message
        });
    }
};

// Obtener survey responses por múltiples tickets
const getSurveyResponsesByMultipleTickets = async (req, res = response) => {
    const { ticketIds } = req.body; // Array de IDs de tickets
    
    try {
        if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
            return res.status(400).json({
                status: false,
                message: 'ticketIds debe ser un array con al menos un ID'
            });
        }
        
        const surveyResponses = await SurveyResponse.findAll({
            where: {
                IdTicket: ticketIds
            },
            include: [
                {
                    model: Survey,
                    as: 'survey',
                    attributes: ['IdSurvey', 'name', 'description', 'surveyType']
                }
            ],
            order: [['IdTicket', 'ASC'], ['createdAt', 'DESC']]
        });
        
        // Agrupar por ticket
        const groupedByTicket = surveyResponses.reduce((acc, response) => {
            const ticketId = response.IdTicket;
            if (!acc[ticketId]) {
                acc[ticketId] = [];
            }
            acc[ticketId].push(response);
            return acc;
        }, {});
        
        res.status(200).json({
            status: true,
            data: groupedByTicket,
            totalResponses: surveyResponses.length,
            ticketsWithSurveys: Object.keys(groupedByTicket).length
        });
        
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Error al obtener encuestas de múltiples tickets',
            error: error.message
        });
    }
};

// Función auxiliar para uso interno (sin endpoint)
const getSurveyResponsesByTicketInternal = async (ticketId) => {
    try {
        const surveyResponses = await SurveyResponse.findAll({
            where: {
                IdTicket: ticketId
            },
            include: [
                {
                    model: Survey,
                    as: 'survey'
                }
            ]
        });
        
        return surveyResponses;
    } catch (error) {
        throw new Error(`Error al obtener encuestas del ticket ${ticketId}: ${error.message}`);
    }
};

// Función auxiliar para múltiples tickets (sin endpoint)
const getSurveyResponsesByMultipleTicketsInternal = async (ticketIds) => {
    try {
        if (!Array.isArray(ticketIds)) {
            throw new Error('ticketIds debe ser un array');
        }
        
        const surveyResponses = await SurveyResponse.findAll({
            where: {
                IdTicket: ticketIds
            },
            include: [
                {
                    model: Survey,
                    as: 'survey'
                }
            ]
        });
        
        return surveyResponses;
    } catch (error) {
        throw new Error(`Error al obtener encuestas de múltiples tickets: ${error.message}`);
    }
};

const createSurvey = async (req, res = response) => {
    
     const { name, description, surveyType, questions, requestGroupIds = {}, assignToAllGroups = false } = req.body;
    
    try {
        // Crear la encuesta
        let assignmentData = {
            assignedToAllGroups: assignToAllGroups
        };

        if (!assignToAllGroups && Object.keys(requestGroupIds).length > 0) {
            // ✅ Convertir el objeto a array y extraer los requestGroupId
            const groupIds = Object.values(requestGroupIds).map(group => group.requestGroupId);
            
            console.log('Grupos extraídos para validación:', groupIds);

            // Validar que los requestGroups existen
            const Groups = require('../model/requestGroup');
            const existingGroups = await Groups.findAll({
                where: { IdRequestGroup: { [Op.in]: groupIds } },
                attributes: ['IdRequestGroup']
            });

            if (existingGroups.length !== groupIds.length) {
                const foundIds = existingGroups.map(g => g.IdGroup);
                const notFoundIds = groupIds.filter(id => !foundIds.includes(id));
                
                return res.status(400).json({
                    status: false,
                    message: 'Algunos requestGroups especificados no existen',
                    data: {
                        notFound: notFoundIds,
                        found: foundIds
                    }
                });
            }

            // ✅ Usar la estructura completa que viene del frontend
            assignmentData.assignedRequestGroups = Object.values(requestGroupIds).map(group => ({
                requestGroupId: group.requestGroupId,
                assignedAt: group.assignedAt || new Date().toISOString(),
                assignedBy: group.assignedBy || req.user?.IdUser || null
            }));
        }

        const survey = await Survey.create({
            name,
            description,
            surveyType,
            isActive: true,
            isTemplate: true,
            ...assignmentData
        });
        
        // Crear las preguntas si se proporcionan
        if (questions && Array.isArray(questions)) {
            const surveyQuestions = [];
            
            for (const question of questions) {
                const surveyQuestion = await SurveyQuestion.create({
                    IdSurvey: survey.IdSurvey,
                    question: question.question,
                    questionType: question.questionType,
                    options: question.options || null,
                    isRequired: question.isRequired || false,
                    order: question.order || 1
                });
                surveyQuestions.push(surveyQuestion);
            }
            
            survey.dataValues.questions = surveyQuestions;
        }
        
        res.status(201).json({
            status: true,
            message: 'Encuesta creada exitosamente',
            data: survey
        });
        
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Error al crear encuesta',
            error: error.message
        });
    }
};

// Obtener todas las encuestas disponibles
// Obtener todas las encuestas disponibles con paginación y filtros
const getAllSurveys = async (req, res = response) => {
    try {
        const {
            page = 1,
            pageSize = 12,
            name,
            surveyType,
            isActive,
            isTemplate,
            search,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'DESC',
            requestGroupId
        } = req.query;

        // Validar y convertir parámetros de paginación
        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        const offset = (pageNum - 1) * pageSizeNum;

        // Construir condiciones WHERE
        const whereConditions = {};

        // Filtro por nombre específico
        if (name) {
            whereConditions.name = {
                [Op.like]: `%${name}%`
            };
        }

        // Filtro por tipo de encuesta
        if (surveyType) {
            whereConditions.surveyType = surveyType;
        }

        // Filtro por estado activo
        if (isActive !== undefined) {
            whereConditions.isActive = isActive === 'true';
        }

        // Filtro por template
        if (isTemplate !== undefined) {
            whereConditions.isTemplate = isTemplate === 'true';
        }

        // Filtro por búsqueda general (nombre o descripción)
        if (search) {
            whereConditions[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        // Filtro por rango de fechas
        if (startDate && endDate) {
            const startDateTime = new Date(startDate);
            startDateTime.setHours(0, 0, 0, 0);

            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);

            whereConditions.createdAt = {
                [Op.between]: [startDateTime, endDateTime]
            };
        } else if (startDate) {
            const startDateTime = new Date(startDate);
            startDateTime.setHours(0, 0, 0, 0);

            whereConditions.createdAt = {
                [Op.gte]: startDateTime
            };
        } else if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);

            whereConditions.createdAt = {
                [Op.lte]: endDateTime
            };
        }

        // Validar campo de ordenamiento
        const allowedSortFields = [
            'IdSurvey', 'name', 'description', 'surveyType', 
            'isActive', 'isTemplate', 'createdAt', 'updatedAt'
        ];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const sortDirection = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

         if (requestGroupId) {
            whereConditions[Op.or] = [
                { assignedToAllGroups: true },
                { 
                    assignedRequestGroups: {
                        [Op.contains]: [{ requestGroupId: parseInt(requestGroupId) }]
                    }
                }
            ];
        }

        // Consulta principal con paginación
        const surveys = await Survey.findAndCountAll({
            where: whereConditions,
            include: [
                {
                    model: SurveyQuestion,
                    as: 'questions',
                    attributes: [
                        'IdSurveyQuestion', 
                        'question', 
                        'questionType', 
                        'options', 
                        'isRequired', 
                        'order'
                    ],
                    required: false // LEFT JOIN para incluir encuestas sin preguntas
                }
            ],
            order: [
                [sortField, sortDirection],
                [{ model: SurveyQuestion, as: 'questions' }, 'order', 'ASC'] // Ordenar preguntas por orden
            ],
            limit: pageSizeNum,
            offset: offset,
            distinct: true // Para contar correctamente con JOINs
        });

        // Calcular información de paginación
        const totalPages = Math.ceil(surveys.count / pageSizeNum);
        const hasNextPage = pageNum < totalPages;
        const hasPreviousPage = pageNum > 1;

        // Procesar datos para incluir estadísticas de cada encuesta
        const processedSurveys = await Promise.all(
            surveys.rows.map(async (survey) => {
                const surveyData = survey.toJSON();

                // Obtener estadísticas de uso de la encuesta
                const usageStats = await SurveyResponse.findAll({
                    where: { IdSurvey: survey.IdSurvey },
                    attributes: [
                        'status',
                        [sequelize.fn('COUNT', sequelize.col('IdSurveyResponse')), 'count']
                    ],
                    group: ['status'],
                    raw: true
                });

                // Procesar estadísticas
                const stats = {
                    total: 0,
                    sent: 0,
                    completed: 0,
                    expired: 0,
                    in_progress: 0
                };

                usageStats.forEach(stat => {
                    stats[stat.status] = parseInt(stat.count) || 0;
                    stats.total += parseInt(stat.count) || 0;
                });
                let assignmentInfo = {
                    assignedToAllGroups: survey.assignedToAllGroups,
                    totalAssignedGroups: 0,
                    assignedGroups: []
                };

                if (survey.assignedToAllGroups) {
                    // Contar todos los grupos activos
                    const Groups = require('../model/groups');
                    const totalGroups = await Groups.count({ where: { isActive: true } });
                    assignmentInfo.totalAssignedGroups = totalGroups;
                    assignmentInfo.assignedGroups = ['all'];
                } else if (survey.assignedRequestGroups && survey.assignedRequestGroups.length > 0) {
                    assignmentInfo.totalAssignedGroups = survey.assignedRequestGroups.length;
                    assignmentInfo.assignedGroups = survey.assignedRequestGroups.map(a => a.requestGroupId);
                }

                // Agregar información adicional
                surveyData.usageStats = stats;
                surveyData.totalQuestions = surveyData.questions ? surveyData.questions.length : 0;
                surveyData.requiredQuestions = surveyData.questions ? 
                    surveyData.questions.filter(q => q.isRequired).length : 0;
                surveyData.assignmentInfo = assignmentInfo;

                return surveyData;
            })
        );

        // Preparar respuesta
        const responseData = {
            surveys: processedSurveys,
            pagination: {
                currentPage: pageNum,
                totalPages: totalPages,
                totalItems: surveys.count,
                itemsPerPage: pageSizeNum,
                hasNextPage: hasNextPage,
                hasPreviousPage: hasPreviousPage,
                startIndex: offset + 1,
                endIndex: Math.min(offset + pageSizeNum, surveys.count)
            },
            filters: {
                name: name || null,
                surveyType: surveyType || null,
                isActive: isActive || null,
                isTemplate: isTemplate || null,
                search: search || null,
                startDate: startDate || null,
                endDate: endDate || null,
                sortBy: sortField,
                sortOrder: sortDirection
            },
            summary: {
                totalSurveys: surveys.count,
                activeSurveys: processedSurveys.filter(s => s.isActive).length,
                templates: processedSurveys.filter(s => s.isTemplate).length,
                surveyTypes: [...new Set(processedSurveys.map(s => s.surveyType))].filter(Boolean)
            }
        };

        res.status(200).json({
            status: true,
            data: responseData
        });

    } catch (error) {
        console.error('Error en getAllSurveys:', error);
        res.status(500).json({
            status: false,
            message: 'Error al obtener encuestas',
            error: error.message
        });
    }
};

// Obtener una encuesta específica por ID
const getSurveyById = async (req, res = response) => {
    const { surveyId } = req.params;
    
    try {
        const survey = await Survey.findByPk(surveyId, {
            include: [
                {
                    model: SurveyQuestion,
                    as: 'questions',
                    order: [['order', 'ASC']]
                }
            ]
        });
        
        if (!survey) {
            return res.status(404).json({
                status: false,
                message: 'Encuesta no encontrada'
            });
        }
        let assignmentDetails = {
            assignedToAllGroups: survey.assignedToAllGroups,
            assignedRequestGroups: survey.assignedRequestGroups,
            assignedGroupsDetails: []
        };

        if (survey.assignedToAllGroups) {
            // Obtener información de todos los grupos
            const Groups = require('../model/groups');
            const allGroups = await Groups.findAll({
                where: { isActive: true },
                attributes: ['IdGroup', 'name'],
                order: [['name', 'ASC']]
            });
            
            assignmentDetails.assignedGroupsDetails = allGroups.map(group => ({
                ...group.toJSON(),
                assignmentType: 'all_groups'
            }));
        } else if (survey.assignedRequestGroups && survey.assignedRequestGroups.length > 0) {
            // Obtener información de grupos específicos
            const groupIds = survey.assignedRequestGroups.map(a => a.requestGroupId);
            const Groups = require('../model/groups');
            const assignedGroups = await Groups.findAll({
                where: { IdGroup: { [Op.in]: groupIds } },
                attributes: ['IdGroup', 'name'],
                order: [['name', 'ASC']]
            });

            assignmentDetails.assignedGroupsDetails = assignedGroups.map(group => {
                const assignmentInfo = survey.assignedRequestGroups.find(
                    a => a.requestGroupId === group.IdGroup
                );
                return {
                    ...group.toJSON(),
                    assignmentType: 'specific_group',
                    assignedAt: assignmentInfo.assignedAt,
                    assignedBy: assignmentInfo.assignedBy
                };
            });
        }
        
        res.status(200).json({
            status: true,
            data: {
                ...survey.toJSON(),
                assignmentDetails
            }
        });
        
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Error al obtener encuesta',
            error: error.message
        });
    }
};

// Asignar una encuesta a un ticket específico
const assignSurveyToTicket = async (req, res = response) => {
    const { surveyId, ticketId, applicantId,userRequestGroupId } = req.body;
    
    try {
        // Verificar que la encuesta existe
        if (userRequestGroupId) {
            const accessValidation = await validateSurveyAccessByRequestGroup(surveyId, userRequestGroupId);
            if (!accessValidation.hasAccess) {
                return res.status(403).json({
                    status: false,
                    message: 'No tienes acceso a esta encuesta desde tu requestGroup',
                    reason: accessValidation.reason
                });
            }
        }

        const survey = await Survey.findByPk(surveyId);
        if (!survey) {
            return res.status(404).json({
                status: false,
                message: 'Encuesta no encontrada'
            });
        }
        
        // Verificar si ya existe una encuesta para este ticket (sin importar el status)
        let existingResponse = await SurveyResponse.findOne({
            where: {
                IdSurvey: surveyId,
                IdTicket: ticketId
            }
        });
        
        if (existingResponse) {
            // Si ya existe, verificar si está completada
            if (existingResponse.status === 'completed') {
                return res.status(400).json({
                    status: false,
                    message: 'No se puede reenviar una encuesta ya completada'
                });
            }
            
            // Obtener el array actual y crear una copia mutable
            const currentSentAt = Array.isArray(existingResponse.sentAt) 
                ? [...existingResponse.sentAt] 
                : [];
            
            const newSentRecord = {
                date: new Date().toISOString(),
                attempt: currentSentAt.length + 1
            };
            
            // Agregar el nuevo registro
            currentSentAt.push(newSentRecord);
            
            console.log('Array antes de actualizar:', existingResponse.sentAt);
            console.log('Array después de agregar:', currentSentAt);
            console.log('Nuevo intento:', newSentRecord);
            
            await existingResponse.update({
                sentAt: currentSentAt,
                totalSentCount: currentSentAt.length,
                status: 'sent',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                IdApplicant: applicantId || existingResponse.IdApplicant
            });
            
            // Recargar para obtener datos actualizados
            await existingResponse.reload();
            
            console.log('Array después de actualizar en BD:', existingResponse.sentAt);
            
            res.status(200).json({
                status: true,
                message: 'Encuesta reenviada exitosamente al ticket',
                data: {
                    action: 'resent',
                    surveyResponse: existingResponse,
                    newAttempt: newSentRecord,
                    totalSent: existingResponse.totalSentCount
                }
            });
            
        } else {
            // Si no existe, crear una nueva asignación de encuesta
            const surveyResponse = await SurveyResponse.create({
                IdSurvey: surveyId,
                IdTicket: ticketId,
                IdApplicant: applicantId || null,
                status: 'sent',
                sentAt: [{
                    date: new Date().toISOString(),
                    attempt: 1
                }],
                totalSentCount: 1,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });
            
            res.status(201).json({
                status: true,
                message: 'Encuesta asignada exitosamente al ticket',
                data: {
                    action: 'created',
                    surveyResponse: surveyResponse,
                    newAttempt: {
                        date: new Date().toISOString(),
                        attempt: 1
                    },
                    totalSent: 1
                }
            });
        }
        
    } catch (error) {
        console.error('Error en assignSurveyToTicket:', error);
        res.status(500).json({
            status: false,
            message: 'Error al asignar encuesta al ticket',
            error: error.message
        });
    }
};

// Actualizar una encuesta existente
const updateSurvey = async (req, res = response) => {
    const { surveyId } = req.params;
    const { name, description, surveyType, isActive, questions, assignToAllGroups, // ✅ Nuevo campo opcional
        requestGroupIds  } = req.body;
        console.log(requestGroupIds);
        
    
    try {
        const survey = await Survey.findByPk(surveyId);
        
        if (!survey) {
            return res.status(404).json({
                status: false,
                message: 'Encuesta no encontrada'
            });
        }

        let updateData = {
            name: name || survey.name,
            description: description || survey.description,
            surveyType: surveyType || survey.surveyType,
            isActive: isActive !== undefined ? isActive : survey.isActive
        };

        // ✅ Manejar cambios en asignación de requestGroups si se proporciona
        if (assignToAllGroups !== undefined || requestGroupIds !== undefined) {
            if (assignToAllGroups) {
                updateData.assignedToAllGroups = true;
                updateData.assignedRequestGroups = null;
            } else if (requestGroupIds !== undefined) {
                // ✅ Verificar si requestGroupIds es un objeto con elementos
                const hasRequestGroups = requestGroupIds && 
                    typeof requestGroupIds === 'object' && 
                    Object.keys(requestGroupIds).length > 0;

                if (hasRequestGroups) {
                    // ✅ Convertir el objeto a array y extraer los requestGroupId
                    const groupIds = Object.values(requestGroupIds).map(group => group.requestGroupId);
                    
                    console.log('Grupos extraídos para validación:', groupIds);

                    // Validar que los requestGroups existen
                    const Groups = require('../model/requestGroup');
                    const existingGroups = await Groups.findAll({
                        where: { IdRequestGroup: { [Op.in]: groupIds } },
                        attributes: ['IdRequestGroup']
                    });

                    if (existingGroups.length !== groupIds.length) {
                        const foundIds = existingGroups.map(g => g.IdGroup);
                        const notFoundIds = groupIds.filter(id => !foundIds.includes(id));
                        
                        return res.status(400).json({
                            status: false,
                            message: 'Algunos requestGroups especificados no existen',
                            data: {
                                notFound: notFoundIds,
                                found: foundIds
                            }
                        });
                    }

                    updateData.assignedToAllGroups = false;
                    // ✅ Usar la estructura completa que viene del frontend
                    updateData.assignedRequestGroups = Object.values(requestGroupIds).map(group => ({
                        requestGroupId: group.requestGroupId,
                        assignedAt: group.assignedAt || new Date().toISOString(),
                        assignedBy: group.assignedBy || req.user?.IdUser || null
                    }));
                } else {
                    // Objeto vacío o null = remover todas las asignaciones
                    updateData.assignedToAllGroups = false;
                    updateData.assignedRequestGroups = null;
                }
            }
        }

        console.log('updateData final:', updateData);
        // Actualizar datos básicos de la encuesta
        await survey.update(updateData);

        // Actualizar preguntas si se proporcionan
        if (questions && Array.isArray(questions)) {
            // Eliminar todas las preguntas existentes
            await SurveyQuestion.destroy({
                where: {
                    IdSurvey: surveyId
                }
            });
            
            // Crear las nuevas preguntas
            const surveyQuestions = [];
            for (const question of questions) {
                const surveyQuestion = await SurveyQuestion.create({
                    IdSurvey: surveyId,
                    question: question.question,
                    questionType: question.questionType,
                    options: question.options || null,
                    isRequired: question.isRequired || false,
                    order: question.order || 1
                });
                surveyQuestions.push(surveyQuestion);
            }
            
            // Agregar las preguntas al objeto de respuesta
            survey.dataValues.questions = surveyQuestions;
        }
        
        // Obtener la encuesta completa con preguntas para la respuesta
        const updatedSurvey = await Survey.findByPk(surveyId, {
            include: [
                {
                    model: SurveyQuestion,
                    as: 'questions',
                    order: [['order', 'ASC']]
                }
            ]
        });
        
        res.status(200).json({
            status: true,
            message: 'Encuesta actualizada exitosamente',
            data: updatedSurvey
        });
        
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Error al actualizar encuesta',
            error: error.message
        });
    }
};

// Eliminar (desactivar) una encuesta
const deleteSurvey = async (req, res = response) => {
    const { surveyId } = req.params;
    
    try {
        const survey = await Survey.findByPk(surveyId);
        
        if (!survey) {
            return res.status(404).json({
                status: false,
                message: 'Encuesta no encontrada'
            });
        }
        
        await survey.update({ isActive: false });
        
        res.status(200).json({
            status: true,
            message: 'Encuesta eliminada exitosamente'
        });
        
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Error al eliminar encuesta',
            error: error.message
        });
    }
};


const addSentRecordEndpoint = async (req, res = response) => {
    const { ticketId, surveyId } = req.body;
    
    try {
        // Validar que se proporcionaron los parámetros requeridos
        if (!ticketId || !surveyId) {
            return res.status(400).json({
                status: false,
                message: 'ticketId y surveyId son requeridos'
            });
        }
        
        // Buscar la SurveyResponse existente
        const surveyResponse = await SurveyResponse.findOne({
            where: {
                IdTicket: ticketId,
                IdSurvey: surveyId
            }
        });
        
        if (!surveyResponse) {
            return res.status(404).json({
                status: false,
                message: 'No se encontró una encuesta asignada a este ticket'
            });
        }
        
        // Verificar que la encuesta no esté completada
        if (surveyResponse.status === 'completed') {
            return res.status(400).json({
                status: false,
                message: 'No se puede reenviar una encuesta ya completada'
            });
        }
        
        // Agregar el nuevo registro de envío
           const currentSentAt = Array.isArray(surveyResponse.sentAt) 
                ? [...surveyResponse.sentAt] 
                : [];

        const newSentRecord = {
            date: new Date().toISOString(),
            attempt: currentSentAt.length + 1,
            channel:'notification' // Puedes agregar un campo para el canal si es necesario
        };
        
        currentSentAt.push(newSentRecord);
        
        // Actualizar la SurveyResponse
        await surveyResponse.update({
            sentAt: currentSentAt,
            totalSentCount: currentSentAt.length,
            status: 'sent', // Resetear estado si estaba expirado
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Nueva fecha de expiración
        });
        
        // Recargar la instancia para obtener los datos actualizados
        await surveyResponse.reload();
        
        res.status(200).json({
            status: true,
            message: 'Registro de envío agregado exitosamente',
            data: {
                surveyResponse: surveyResponse,
                newRecord: newSentRecord,
                totalSent: surveyResponse.totalSentCount
            }
        });
        
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Error al agregar registro de envío',
            error: error.message
        });
    }
};

// Agregar múltiples registros de envío (por si quieres enviar a múltiples tickets)
const addSentRecordMultiple = async (req, res = response) => {
    const { tickets, surveyId } = req.body; // tickets: array de ticketIds
    
    try {
        // Validar parámetros
        if (!surveyId || !Array.isArray(tickets) || tickets.length === 0) {
            return res.status(400).json({
                status: false,
                message: 'surveyId y tickets (array) son requeridos'
            });
        }
        
        const results = [];
        const errors = [];
        
        for (const ticketId of tickets) {
            try {
                // Buscar la SurveyResponse existente
                const surveyResponse = await SurveyResponse.findOne({
                    where: {
                        IdTicket: ticketId,
                        IdSurvey: surveyId
                    }
                });
                
                if (!surveyResponse) {
                    errors.push({
                        ticketId,
                        error: 'No se encontró encuesta asignada'
                    });
                    continue;
                }
                
                // Verificar que no esté completada
                if (surveyResponse.status === 'completed') {
                    errors.push({
                        ticketId,
                        error: 'Encuesta ya completada'
                    });
                    continue;
                }
                
                // Agregar el nuevo registro de envío
                const currentSentAt = surveyResponse.sentAt || [];
                const newSentRecord = {
                    date: new Date().toISOString(),
                    attempt: currentSentAt.length + 1
                };
                
                currentSentAt.push(newSentRecord);
                
                await surveyResponse.update({
                    sentAt: currentSentAt,
                    totalSentCount: currentSentAt.length,
                    status: 'sent',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                });
                
                results.push({
                    ticketId,
                    surveyResponseId: surveyResponse.IdSurveyResponse,
                    newRecord: newSentRecord,
                    totalSent: currentSentAt.length
                });
                
            } catch (ticketError) {
                errors.push({
                    ticketId,
                    error: ticketError.message
                });
            }
        }
        
        res.status(200).json({
            status: true,
            message: 'Proceso completado',
            data: {
                successful: results,
                errors: errors,
                totalProcessed: tickets.length,
                successCount: results.length,
                errorCount: errors.length
            }
        });
        
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Error al procesar registros de envío múltiples',
            error: error.message
        });
    }
};

const getSurveyResponseByTicketId = async (req, res = response) => {
    const { ticketId } = req.params;
    const { surveyId } = req.query; // Opcional: filtrar por surveyId específico
    
    try {
        const whereClause = { IdTicket: ticketId };
        
        // Si se proporciona surveyId, agregarlo al filtro
        if (surveyId) {
            whereClause.IdSurvey = surveyId;
        }
        
        const surveyResponse = await SurveyResponse.findOne({
            where: whereClause,
            include: [
                {
                    model: Survey,
                    as: 'survey',
                    attributes: ['IdSurvey', 'name', 'description', 'surveyType'],
                    include: [
                        {
                            model: SurveyQuestion,
                            as: 'questions',
                            order: [['order', 'ASC']]
                        }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']] // Obtener la más reciente si hay múltiples
        });
        
        if (!surveyResponse) {
            return res.status(404).json({
                status: false,
                message: surveyId ? 
                    'No se encontró una encuesta específica para este ticket' : 
                    'No se encontró ninguna encuesta para este ticket'
            });
        }
        
        // Agregar información del historial de envíos
        const sentHistory = getSentHistory(surveyResponse);
        
        res.status(200).json({
            status: true,
            data: {
                ...surveyResponse.survey.toJSON(),
                status: surveyResponse.status
                //sentHistory
            }
        });
        
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Error al obtener la encuesta del ticket',
            error: error.message
        });
    }
};

// Obtener estadísticas generales de encuestas
const getSurveysStats = async (req, res = response) => {
    try {
        // Estadísticas por tipo de encuesta
        const surveyTypeStats = await Survey.findAll({
            attributes: [
                'surveyType',
                [sequelize.fn('COUNT', sequelize.col('IdSurvey')), 'count']
            ],
            where: { isActive: true },
            group: ['surveyType'],
            raw: true
        });

        // Estadísticas por estado
        const statusStats = await Survey.findAll({
            attributes: [
                'isActive',
                [sequelize.fn('COUNT', sequelize.col('IdSurvey')), 'count']
            ],
            group: ['isActive'],
            raw: true
        });

        // Estadísticas de respuestas por mes
        const monthlyResponseStats = await SurveyResponse.findAll({
            attributes: [
                [sequelize.fn('YEAR', sequelize.col('createdAt')), 'year'],
                [sequelize.fn('MONTH', sequelize.col('createdAt')), 'month'],
                [sequelize.fn('COUNT', sequelize.col('IdSurveyResponse')), 'count']
            ],
            group: [
                sequelize.fn('YEAR', sequelize.col('createdAt')),
                sequelize.fn('MONTH', sequelize.col('createdAt'))
            ],
            order: [
                [sequelize.fn('YEAR', sequelize.col('createdAt')), 'DESC'],
                [sequelize.fn('MONTH', sequelize.col('createdAt')), 'DESC']
            ],
            limit: 12, // Últimos 12 meses
            raw: true
        });

        // Top 5 encuestas más usadas
        const topSurveys = await Survey.findAll({
            attributes: [
                'IdSurvey',
                'name',
                'surveyType',
                [sequelize.fn('COUNT', sequelize.col('surveyResponses.IdSurveyResponse')), 'responseCount']
            ],
            include: [
                {
                    model: SurveyResponse,
                    as: 'surveyResponses',
                    attributes: []
                }
            ],
            group: ['Survey.IdSurvey'],
            order: [[sequelize.fn('COUNT', sequelize.col('surveyResponses.IdSurveyResponse')), 'DESC']],
            limit: 5,
            subQuery: false
        });

        const assignmentStats = await Survey.findAll({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('IdSurvey')), 'total'],
                [sequelize.fn('SUM', sequelize.case()
                    .when(sequelize.col('assignedToAllGroups'), 1)
                    .else(0)
                ), 'assignedToAll'],
                [sequelize.fn('SUM', sequelize.case()
                    .when(sequelize.and(
                        sequelize.col('assignedToAllGroups'), false,
                        sequelize.not(sequelize.col('assignedRequestGroups'), null)
                    ), 1)
                    .else(0)
                ), 'assignedToSpecificGroups'],
                [sequelize.fn('SUM', sequelize.case()
                    .when(sequelize.and(
                        sequelize.col('assignedToAllGroups'), false,
                        sequelize.col('assignedRequestGroups'), null
                    ), 1)
                    .else(0)
                ), 'notAssigned']
            ],
            where: { isActive: true },
            raw: true
        });

        res.status(200).json({
            status: true,
            data: {
                surveyTypeStats,
                statusStats,
                monthlyResponseStats,
                topSurveys,
                assignmentStats
            }
        });

    } catch (error) {
        console.error('Error en getSurveysStats:', error);
        res.status(500).json({
            status: false,
            message: 'Error al obtener estadísticas de encuestas',
            error: error.message
        });
    }
};

const deleteSurveyPermanently = async (req, res = response) => {
    const { surveyId } = req.params;
    const { force = false } = req.query; // Parámetro para forzar eliminación
    
    try {
        const survey = await Survey.findByPk(surveyId);
        
        if (!survey) {
            return res.status(404).json({
                status: false,
                message: 'Encuesta no encontrada'
            });
        }

        // Verificar dependencias y obtener estadísticas
        const surveyResponsesCount = await SurveyResponse.count({
            where: { IdSurvey: surveyId }
        });

        const questionsCount = await SurveyQuestion.count({
            where: { IdSurvey: surveyId }
        });

        // Verificar si hay respuestas completadas
        const completedResponsesCount = await SurveyResponse.count({
            where: { 
                IdSurvey: surveyId,
                status: 'completed'
            }
        });

        // Verificar si hay respuestas en progreso
        const activeResponsesCount = await SurveyResponse.count({
            where: { 
                IdSurvey: surveyId,
                status: {
                    [Op.in]: ['sent', 'in_progress']
                }
            }
        });

        // Si hay respuestas activas o completadas, requerir confirmación
        if ((completedResponsesCount > 0 || activeResponsesCount > 0) && force !== 'true') {
            return res.status(409).json({
                status: false,
                message: 'La encuesta tiene respuestas asociadas. Use force=true para confirmar eliminación permanente',
                data: {
                    surveyResponses: surveyResponsesCount,
                    completedResponses: completedResponsesCount,
                    activeResponses: activeResponsesCount,
                    questions: questionsCount,
                    requiresConfirmation: true,
                    warning: 'Esta acción eliminará permanentemente todos los datos asociados y no se puede deshacer',
                    hint: 'Agregue ?force=true a la URL para confirmar la eliminación permanente'
                }
            });
        }

        // Usar transacción para asegurar integridad
        const transaction = await sequelize.transaction();

        try {
            let deletionSummary = {
                survey: {
                    id: survey.IdSurvey,
                    name: survey.name,
                    surveyType: survey.surveyType
                },
                deleted: {
                    surveyResponses: 0,
                    questions: 0
                }
            };

            // 1. Eliminar todas las respuestas de encuesta (SurveyResponse)
            if (surveyResponsesCount > 0) {
                const deletedResponses = await SurveyResponse.destroy({
                    where: { IdSurvey: surveyId },
                    transaction
                });
                deletionSummary.deleted.surveyResponses = deletedResponses;
                console.log(`Eliminadas ${deletedResponses} respuestas de la encuesta ${surveyId}`);
            }

            // 2. Eliminar todas las preguntas de la encuesta (SurveyQuestion)
            if (questionsCount > 0) {
                const deletedQuestions = await SurveyQuestion.destroy({
                    where: { IdSurvey: surveyId },
                    transaction
                });
                deletionSummary.deleted.questions = deletedQuestions;
                console.log(`Eliminadas ${deletedQuestions} preguntas de la encuesta ${surveyId}`);
            }

            // 3. Eliminar la encuesta principal (Survey)
            await survey.destroy({ transaction });

            // Confirmar transacción
            await transaction.commit();

            console.log(`Encuesta ${surveyId} eliminada permanentemente con todas sus dependencias`);

            res.status(200).json({
                status: true,
                message: 'Encuesta eliminada permanentemente junto con todas sus dependencias',
                data: deletionSummary
            });

        } catch (transactionError) {
            // Revertir transacción en caso de error
            await transaction.rollback();
            throw transactionError;
        }

    } catch (error) {
        console.error('Error deleting survey permanently:', error);
        res.status(500).json({
            status: false,
            message: 'Error al eliminar la encuesta permanentemente',
            error: error.message
        });
    }
};

// Eliminar múltiples encuestas permanentemente
const deleteSurveysPermanently = async (req, res = response) => {
    const { surveyIds } = req.body; // Array de IDs de encuestas
    const { force = false } = req.query;
    
    try {
        if (!Array.isArray(surveyIds) || surveyIds.length === 0) {
            return res.status(400).json({
                status: false,
                message: 'surveyIds debe ser un array con al menos un ID'
            });
        }

        // Verificar que todas las encuestas existen
        const surveys = await Survey.findAll({
            where: { IdSurvey: { [Op.in]: surveyIds } }
        });

        if (surveys.length !== surveyIds.length) {
            const foundIds = surveys.map(s => s.IdSurvey);
            const notFoundIds = surveyIds.filter(id => !foundIds.includes(id));
            
            return res.status(404).json({
                status: false,
                message: 'Algunas encuestas no fueron encontradas',
                data: {
                    notFound: notFoundIds,
                    found: foundIds
                }
            });
        }

        // Verificar dependencias para todas las encuestas
        const dependenciesCheck = await Promise.all(
            surveyIds.map(async (surveyId) => {
                const surveyResponsesCount = await SurveyResponse.count({
                    where: { IdSurvey: surveyId }
                });

                const questionsCount = await SurveyQuestion.count({
                    where: { IdSurvey: surveyId }
                });

                const completedResponsesCount = await SurveyResponse.count({
                    where: { 
                        IdSurvey: surveyId,
                        status: 'completed'
                    }
                });

                const activeResponsesCount = await SurveyResponse.count({
                    where: { 
                        IdSurvey: surveyId,
                        status: { [Op.in]: ['sent', 'in_progress'] }
                    }
                });

                return {
                    surveyId,
                    surveyResponsesCount,
                    questionsCount,
                    completedResponsesCount,
                    activeResponsesCount,
                    hasActiveDependencies: completedResponsesCount > 0 || activeResponsesCount > 0
                };
            })
        );

        // Verificar si alguna encuesta tiene dependencias activas
        const surveysWithDependencies = dependenciesCheck.filter(check => check.hasActiveDependencies);

        if (surveysWithDependencies.length > 0 && force !== 'true') {
            return res.status(409).json({
                status: false,
                message: 'Algunas encuestas tienen respuestas asociadas. Use force=true para confirmar eliminación permanente',
                data: {
                    surveysWithDependencies: surveysWithDependencies,
                    totalSurveys: surveyIds.length,
                    surveysWithResponses: surveysWithDependencies.length,
                    requiresConfirmation: true,
                    warning: 'Esta acción eliminará permanentemente todos los datos asociados y no se puede deshacer',
                    hint: 'Agregue ?force=true a la URL para confirmar la eliminación permanente'
                }
            });
        }

        // Usar transacción para eliminar todas las encuestas
        const transaction = await sequelize.transaction();

        try {
            let deletionSummary = {
                totalSurveys: surveyIds.length,
                deleted: {
                    surveys: 0,
                    surveyResponses: 0,
                    questions: 0
                },
                details: []
            };

            for (const surveyId of surveyIds) {
                const survey = surveys.find(s => s.IdSurvey === surveyId);
                const check = dependenciesCheck.find(c => c.surveyId === surveyId);

                // Eliminar respuestas de la encuesta
                let deletedResponses = 0;
                if (check.surveyResponsesCount > 0) {
                    deletedResponses = await SurveyResponse.destroy({
                        where: { IdSurvey: surveyId },
                        transaction
                    });
                }

                // Eliminar preguntas de la encuesta
                let deletedQuestions = 0;
                if (check.questionsCount > 0) {
                    deletedQuestions = await SurveyQuestion.destroy({
                        where: { IdSurvey: surveyId },
                        transaction
                    });
                }

                // Eliminar la encuesta
                await Survey.destroy({
                    where: { IdSurvey: surveyId },
                    transaction
                });

                // Agregar a resumen
                deletionSummary.deleted.surveyResponses += deletedResponses;
                deletionSummary.deleted.questions += deletedQuestions;
                deletionSummary.deleted.surveys += 1;

                deletionSummary.details.push({
                    surveyId: surveyId,
                    surveyName: survey.name,
                    deletedResponses: deletedResponses,
                    deletedQuestions: deletedQuestions
                });

                console.log(`Encuesta ${surveyId} eliminada: ${deletedResponses} respuestas, ${deletedQuestions} preguntas`);
            }

            // Confirmar transacción
            await transaction.commit();

            console.log(`${deletionSummary.deleted.surveys} encuestas eliminadas permanentemente`);

            res.status(200).json({
                status: true,
                message: 'Encuestas eliminadas permanentemente junto con todas sus dependencias',
                data: deletionSummary
            });

        } catch (transactionError) {
            await transaction.rollback();
            throw transactionError;
        }

    } catch (error) {
        console.error('Error deleting surveys permanently:', error);
        res.status(500).json({
            status: false,
            message: 'Error al eliminar las encuestas permanentemente',
            error: error.message
        });
    }
};

// Agregar estas funciones al surveyController.js

// Asignar una survey a uno o múltiples requestGroups
const assignSurveyToRequestGroups = async (req, res = response) => {
    const { surveyId } = req.params;
    const { requestGroupIds, assignToAll = false } = req.body;
    
    try {
        // Verificar que la encuesta existe
        const survey = await Survey.findByPk(surveyId);
        if (!survey) {
            return res.status(404).json({
                status: false,
                message: 'Encuesta no encontrada'
            });
        }

        let updateData = {};

        if (assignToAll) {
            // Asignar a todos los grupos
            updateData.assignedToAllGroups = true;
            updateData.assignedRequestGroups = null; // Limpiar grupos específicos
        } else {
            // Validar que se proporcionaron grupos específicos
            if (!requestGroupIds || !Array.isArray(requestGroupIds) || requestGroupIds.length === 0) {
                return res.status(400).json({
                    status: false,
                    message: 'requestGroupIds debe ser un array con al menos un ID cuando assignToAll es false'
                });
            }

            // Verificar que todos los requestGroups existen
            const Groups = require('../model/groups'); // Asume que este es tu modelo de requestGroups
            const existingGroups = await Groups.findAll({
                where: { IdGroup: { [Op.in]: requestGroupIds } },
                attributes: ['IdGroup', 'name']
            });

            if (existingGroups.length !== requestGroupIds.length) {
                const foundIds = existingGroups.map(g => g.IdGroup);
                const notFoundIds = requestGroupIds.filter(id => !foundIds.includes(id));
                
                return res.status(404).json({
                    status: false,
                    message: 'Algunos requestGroups no fueron encontrados',
                    data: {
                        notFound: notFoundIds,
                        found: foundIds
                    }
                });
            }

            updateData.assignedToAllGroups = false;
            updateData.assignedRequestGroups = requestGroupIds.map(id => ({
                requestGroupId: id,
                assignedAt: new Date().toISOString(),
                assignedBy: req.user?.IdUser || null // Si tienes autenticación
            }));
        }

        // Actualizar la survey
        await survey.update(updateData);

        // Recargar para obtener datos actualizados
        await survey.reload();

        res.status(200).json({
            status: true,
            message: assignToAll ? 
                'Encuesta asignada a todos los requestGroups' : 
                'Encuesta asignada a requestGroups específicos',
            data: {
                surveyId: survey.IdSurvey,
                assignedToAllGroups: survey.assignedToAllGroups,
                assignedRequestGroups: survey.assignedRequestGroups,
                totalAssignedGroups: assignToAll ? 'all' : requestGroupIds.length
            }
        });

    } catch (error) {
        console.error('Error en assignSurveyToRequestGroups:', error);
        res.status(500).json({
            status: false,
            message: 'Error al asignar encuesta a requestGroups',
            error: error.message
        });
    }
};

// Obtener surveys por requestGroup específico
const getSurveysByRequestGroup = async (req, res = response) => {
    const { requestGroupId } = req.params;
    const {
        page = 1,
        pageSize = 12,
        surveyType,
        isActive = true,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
    } = req.query;

    try {
        // Validar que el requestGroup existe
        const Groups = require('../model/requestGroup');
        const requestGroup = await Groups.findByPk(requestGroupId);
        
        if (!requestGroup) {
            return res.status(404).json({
                status: false,
                message: 'RequestGroup no encontrado'
            });
        }

        // Validar y convertir parámetros de paginación
        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        const offset = (pageNum - 1) * pageSizeNum;

        // Construir condiciones WHERE
        const isActiveValue = isActive === 'false' ? false : true; // Por defecto true

        // Construir condiciones WHERE
        const whereConditions = {
            isActive: isActiveValue, // ✅ Usar el valor convertido correctamente
            [Op.or]: [
                { assignedToAllGroups: true }, // Surveys asignadas a todos
                sequelize.literal(`JSON_CONTAINS(assignedRequestGroups, '{"requestGroupId": ${parseInt(requestGroupId)}}')`) // Para MySQL
            ]
        };

        // Filtros adicionales
        if (surveyType) {
            whereConditions.surveyType = surveyType;
        }

        if (search) {
            whereConditions[Op.and] = whereConditions[Op.and] || [];
            whereConditions[Op.and].push({
                [Op.or]: [
                    { name: { [Op.like]: `%${search}%` } },
                    { description: { [Op.like]: `%${search}%` } }
                ]
            });
        }

        // Validar campo de ordenamiento
        const allowedSortFields = [
            'IdSurvey', 'name', 'description', 'surveyType', 
            'createdAt', 'updatedAt'
        ];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const sortDirection = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

        // Consulta principal
        const surveys = await Survey.findAndCountAll({
            where: whereConditions,
            include: [
                {
                    model: SurveyQuestion,
                    as: 'questions',
                    attributes: [
                        'IdSurveyQuestion', 
                        'question', 
                        'questionType', 
                        'options', 
                        'isRequired', 
                        'order'
                    ],
                    required: false
                }
            ],
            order: [
                [sortField, sortDirection],
                [{ model: SurveyQuestion, as: 'questions' }, 'order', 'ASC']
            ],
            limit: pageSizeNum,
            offset: offset,
            distinct: true
        });

        // Calcular información de paginación
        const totalPages = Math.ceil(surveys.count / pageSizeNum);
        const hasNextPage = pageNum < totalPages;
        const hasPreviousPage = pageNum > 1;

        // Procesar datos para incluir estadísticas
        const processedSurveys = await Promise.all(
            surveys.rows.map(async (survey) => {
                const surveyData = survey.toJSON();

                // Obtener estadísticas de uso específicas para este requestGroup
                const usageStats = await SurveyResponse.findAll({
                    where: { 
                        IdSurvey: survey.IdSurvey
                        // Aquí podrías agregar filtro por tickets del requestGroup si tienes esa relación
                    },
                    attributes: [
                        'status',
                        [sequelize.fn('COUNT', sequelize.col('IdSurveyResponse')), 'count']
                    ],
                    group: ['status'],
                    raw: true
                });

                // Procesar estadísticas
                const stats = {
                    total: 0,
                    sent: 0,
                    completed: 0,
                    expired: 0,
                    in_progress: 0
                };

                usageStats.forEach(stat => {
                    stats[stat.status] = parseInt(stat.count) || 0;
                    stats.total += parseInt(stat.count) || 0;
                });

                // Determinar cómo está asignada esta survey al grupo
                const assignmentType = survey.assignedToAllGroups ? 'all_groups' : 'specific_group';
                const specificAssignment = survey.assignedRequestGroups?.find(
                    assignment => assignment.requestGroupId === parseInt(requestGroupId)
                );

                return {
                    ...surveyData,
                    usageStats: stats,
                    totalQuestions: surveyData.questions ? surveyData.questions.length : 0,
                    requiredQuestions: surveyData.questions ? 
                        surveyData.questions.filter(q => q.isRequired).length : 0,
                    assignmentInfo: {
                        type: assignmentType,
                        assignedAt: specificAssignment?.assignedAt || null,
                        assignedBy: specificAssignment?.assignedBy || null
                    }
                };
            })
        );

        res.status(200).json({
            status: true,
            data: {
                requestGroup: {
                    id: requestGroup.IdGroup,
                    name: requestGroup.name
                },
                surveys: processedSurveys,
                pagination: {
                    currentPage: pageNum,
                    totalPages: totalPages,
                    totalItems: surveys.count,
                    itemsPerPage: pageSizeNum,
                    hasNextPage: hasNextPage,
                    hasPreviousPage: hasPreviousPage,
                    startIndex: offset + 1,
                    endIndex: Math.min(offset + pageSizeNum, surveys.count)
                },
                filters: {
                    requestGroupId: requestGroupId,
                    surveyType: surveyType || null,
                    isActive: isActive,
                    search: search || null,
                    sortBy: sortField,
                    sortOrder: sortDirection
                },
                summary: {
                    totalSurveys: surveys.count,
                    assignedToAll: processedSurveys.filter(s => s.assignmentInfo.type === 'all_groups').length,
                    assignedSpecifically: processedSurveys.filter(s => s.assignmentInfo.type === 'specific_group').length
                }
            }
        });

    } catch (error) {
        console.error('Error en getSurveysByRequestGroup:', error);
        res.status(500).json({
            status: false,
            message: 'Error al obtener encuestas del requestGroup',
            error: error.message
        });
    }
};

// Obtener todos los requestGroups asignados a una survey
const getRequestGroupsBySurvey = async (req, res = response) => {
    const { surveyId } = req.params;

    try {
        const survey = await Survey.findByPk(surveyId);
        
        if (!survey) {
            return res.status(404).json({
                status: false,
                message: 'Encuesta no encontrada'
            });
        }

        if (survey.assignedToAllGroups) {
            // Si está asignada a todos, obtener todos los grupos activos
            const Groups = require('../model/groups');
            const allGroups = await Groups.findAll({
                where: { isActive: true },
                attributes: ['IdGroup', 'name', 'description'],
                order: [['name', 'ASC']]
            });

            res.status(200).json({
                status: true,
                data: {
                    surveyId: survey.IdSurvey,
                    surveyName: survey.name,
                    assignedToAllGroups: true,
                    totalGroups: allGroups.length,
                    groups: allGroups.map(group => ({
                        ...group.toJSON(),
                        assignmentType: 'all_groups',
                        assignedAt: survey.updatedAt // Usar fecha de actualización de la survey
                    }))
                }
            });
        } else if (survey.assignedRequestGroups && survey.assignedRequestGroups.length > 0) {
            // Si está asignada a grupos específicos
            const groupIds = survey.assignedRequestGroups.map(assignment => assignment.requestGroupId);
            
            const Groups = require('../model/groups');
            const assignedGroups = await Groups.findAll({
                where: { IdGroup: { [Op.in]: groupIds } },
                attributes: ['IdGroup', 'name', 'description'],
                order: [['name', 'ASC']]
            });

            // Combinar información de grupos con información de asignación
            const groupsWithAssignmentInfo = assignedGroups.map(group => {
                const assignmentInfo = survey.assignedRequestGroups.find(
                    assignment => assignment.requestGroupId === group.IdGroup
                );
                
                return {
                    ...group.toJSON(),
                    assignmentType: 'specific_group',
                    assignedAt: assignmentInfo.assignedAt,
                    assignedBy: assignmentInfo.assignedBy
                };
            });

            res.status(200).json({
                status: true,
                data: {
                    surveyId: survey.IdSurvey,
                    surveyName: survey.name,
                    assignedToAllGroups: false,
                    totalGroups: groupsWithAssignmentInfo.length,
                    groups: groupsWithAssignmentInfo
                }
            });
        } else {
            // No está asignada a ningún grupo
            res.status(200).json({
                status: true,
                data: {
                    surveyId: survey.IdSurvey,
                    surveyName: survey.name,
                    assignedToAllGroups: false,
                    totalGroups: 0,
                    groups: []
                }
            });
        }

    } catch (error) {
        console.error('Error en getRequestGroupsBySurvey:', error);
        res.status(500).json({
            status: false,
            message: 'Error al obtener requestGroups de la encuesta',
            error: error.message
        });
    }
};

// Remover asignación de survey a requestGroups específicos
const removeSurveyFromRequestGroups = async (req, res = response) => {
    const { surveyId } = req.params;
    const { requestGroupIds, removeFromAll = false } = req.body;

    try {
        const survey = await Survey.findByPk(surveyId);
        
        if (!survey) {
            return res.status(404).json({
                status: false,
                message: 'Encuesta no encontrada'
            });
        }

        if (removeFromAll) {
            // Remover de todos los grupos
            await survey.update({
                assignedToAllGroups: false,
                assignedRequestGroups: null
            });

            res.status(200).json({
                status: true,
                message: 'Encuesta removida de todos los requestGroups',
                data: {
                    surveyId: survey.IdSurvey,
                    assignedToAllGroups: false,
                    assignedRequestGroups: null
                }
            });
        } else {
            // Remover de grupos específicos
            if (!requestGroupIds || !Array.isArray(requestGroupIds) || requestGroupIds.length === 0) {
                return res.status(400).json({
                    status: false,
                    message: 'requestGroupIds debe ser un array con al menos un ID'
                });
            }

            if (survey.assignedToAllGroups) {
                return res.status(400).json({
                    status: false,
                    message: 'No se puede remover grupos específicos cuando la encuesta está asignada a todos los grupos. Use removeFromAll=true'
                });
            }

            if (!survey.assignedRequestGroups || survey.assignedRequestGroups.length === 0) {
                return res.status(400).json({
                    status: false,
                    message: 'La encuesta no tiene requestGroups asignados específicamente'
                });
            }

            // Filtrar los grupos a remover
            const updatedGroups = survey.assignedRequestGroups.filter(
                assignment => !requestGroupIds.includes(assignment.requestGroupId)
            );

            await survey.update({
                assignedRequestGroups: updatedGroups.length > 0 ? updatedGroups : null
            });

            res.status(200).json({
                status: true,
                message: 'Encuesta removida de requestGroups específicos',
                data: {
                    surveyId: survey.IdSurvey,
                    removedGroups: requestGroupIds,
                    remainingGroups: updatedGroups.length,
                    assignedRequestGroups: updatedGroups
                }
            });
        }

    } catch (error) {
        console.error('Error en removeSurveyFromRequestGroups:', error);
        res.status(500).json({
            status: false,
            message: 'Error al remover encuesta de requestGroups',
            error: error.message
        });
    }
};

// Obtener estadísticas de surveys por requestGroup
const getSurveyStatsByRequestGroup = async (req, res = response) => {
    const { requestGroupId } = req.params;

    try {
        // Verificar que el requestGroup existe
        const Groups = require('../model/groups');
        const requestGroup = await Groups.findByPk(requestGroupId);
        
        if (!requestGroup) {
            return res.status(404).json({
                status: false,
                message: 'RequestGroup no encontrado'
            });
        }

        // Obtener surveys asignadas a este requestGroup
        const assignedSurveys = await Survey.findAll({
            where: {
                isActive: true,
                [Op.or]: [
                    { assignedToAllGroups: true },
                    { 
                        assignedRequestGroups: {
                            [Op.contains]: [{ requestGroupId: parseInt(requestGroupId) }]
                        }
                    }
                ]
            },
            attributes: ['IdSurvey', 'name', 'surveyType', 'assignedToAllGroups']
        });

        // Estadísticas de respuestas por survey
        const surveyResponseStats = await Promise.all(
            assignedSurveys.map(async (survey) => {
                const responseStats = await SurveyResponse.findAll({
                    where: { IdSurvey: survey.IdSurvey },
                    attributes: [
                        'status',
                        [sequelize.fn('COUNT', sequelize.col('IdSurveyResponse')), 'count']
                    ],
                    group: ['status'],
                    raw: true
                });

                const stats = {
                    total: 0,
                    sent: 0,
                    completed: 0,
                    expired: 0,
                    in_progress: 0
                };

                responseStats.forEach(stat => {
                    stats[stat.status] = parseInt(stat.count) || 0;
                    stats.total += parseInt(stat.count) || 0;
                });

                return {
                    surveyId: survey.IdSurvey,
                    surveyName: survey.name,
                    surveyType: survey.surveyType,
                    assignmentType: survey.assignedToAllGroups ? 'all_groups' : 'specific_group',
                    responseStats: stats
                };
            })
        );

        // Estadísticas generales
        const totalStats = surveyResponseStats.reduce((acc, survey) => {
            acc.totalSurveys++;
            acc.totalResponses += survey.responseStats.total;
            acc.totalSent += survey.responseStats.sent;
            acc.totalCompleted += survey.responseStats.completed;
            acc.totalExpired += survey.responseStats.expired;
            acc.totalInProgress += survey.responseStats.in_progress;
            
            if (survey.assignmentType === 'all_groups') {
                acc.surveysAssignedToAll++;
            } else {
                acc.surveysAssignedSpecifically++;
            }

            return acc;
        }, {
            totalSurveys: 0,
            totalResponses: 0,
            totalSent: 0,
            totalCompleted: 0,
            totalExpired: 0,
            totalInProgress: 0,
            surveysAssignedToAll: 0,
            surveysAssignedSpecifically: 0
        });

        // Estadísticas por tipo de encuesta
        const surveyTypeStats = surveyResponseStats.reduce((acc, survey) => {
            const type = survey.surveyType || 'unknown';
            if (!acc[type]) {
                acc[type] = {
                    count: 0,
                    totalResponses: 0,
                    completedResponses: 0
                };
            }
            acc[type].count++;
            acc[type].totalResponses += survey.responseStats.total;
            acc[type].completedResponses += survey.responseStats.completed;
            return acc;
        }, {});

        res.status(200).json({
            status: true,
            data: {
                requestGroup: {
                    id: requestGroup.IdGroup,
                    name: requestGroup.name
                },
                totalStats: totalStats,
                surveyTypeStats: surveyTypeStats,
                surveyDetails: surveyResponseStats,
                completionRate: totalStats.totalSent > 0 ? 
                    ((totalStats.totalCompleted / totalStats.totalSent) * 100).toFixed(2) + '%' : 
                    '0%'
            }
        });

    } catch (error) {
        console.error('Error en getSurveyStatsByRequestGroup:', error);
        res.status(500).json({
            status: false,
            message: 'Error al obtener estadísticas de surveys del requestGroup',
            error: error.message
        });
    }
};


const validateSurveyAccessByRequestGroup = async (surveyId, userRequestGroupId) => {
    const survey = await Survey.findByPk(surveyId);
    
    if (!survey) {
        return { hasAccess: false, reason: 'Survey not found' };
    }

    // Si está asignada a todos los grupos, tiene acceso
    if (survey.assignedToAllGroups) {
        return { hasAccess: true, reason: 'Assigned to all groups' };
    }

    // Si tiene grupos específicos asignados, verificar si el usuario pertenece a alguno
    if (survey.assignedRequestGroups && survey.assignedRequestGroups.length > 0) {
        const hasAccess = survey.assignedRequestGroups.some(
            assignment => assignment.requestGroupId === parseInt(userRequestGroupId)
        );
        
        return { 
            hasAccess: hasAccess, 
            reason: hasAccess ? 'User belongs to assigned group' : 'User does not belong to assigned groups'
        };
    }

    // No está asignada a ningún grupo
    return { hasAccess: false, reason: 'Survey not assigned to any groups' };
};


module.exports = {
    createSurvey,
    getAllSurveys,
    getSurveyById,
    assignSurveyToTicket,
    updateSurvey,
    deleteSurvey,
    sendSurveyToTicket,
    sendSurveyToTickets,
    completeSurvey,
    resendSurvey,
    getSurveyHistory,
    getSurveyResponsesByTicket,
    getSurveyResponsesByMultipleTickets,
    getSurveyResponsesByTicketInternal,
    getSurveyResponsesByMultipleTicketsInternal,
    addSentRecord,
    getSentHistory,
    addSentRecordEndpoint,
    addSentRecordMultiple,
    getSurveyResponseByTicketId,
    getSurveysStats,
    deleteSurveyPermanently,

    assignSurveyToRequestGroups,      
    getSurveysByRequestGroup,         
    getRequestGroupsBySurvey,         
    removeSurveyFromRequestGroups,    
    getSurveyStatsByRequestGroup  
};