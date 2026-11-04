const {response} = require('express');
const { Op, Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const Recipient = require('../model/recipient');
const Applicants = require('../model/applicants');
const Tickets = require('../model/tickets');
const User = require('../model/user');

// CRUD Operations para Recipients

// Crear nuevo recipient
const createRecipient = async (req, res = response) => {
    try {
        const {
            email,
            firstName = null,
            lastName = null,
            phone = null,
            type = 'individual',
            source = 'manual',
            devices = [],
            metadata = {},
            applicantId = null,
            ticketId = null,
            userId = null
        } = req.body;

        // Validaciones básicas
        if (!email) {
            return res.status(400).json({
                status: false,
                message: 'Email es requerido'
            });
        }

        // Verificar si ya existe un recipient con este email
        const existingRecipient = await Recipient.findOne({
            where: { email: email }
        });

        if (existingRecipient) {
            return res.status(400).json({
                status: false,
                message: 'Ya existe un recipient con este email',
                data: existingRecipient
            });
        }

        const recipientId = uuidv4();

        const recipient = await Recipient.create({
            id: recipientId,
            email,
            firstName,
            lastName,
            phone,
            type,
            source,
            devices,
            metadata: {
                ...metadata,
                createdBy: req.user_id || 'system',
                createdAt: new Date()
            },
            applicantId,
            ticketId,
            userId
        });

        res.status(201).json({
            status: true,
            message: 'Recipient creado exitosamente',
            data: recipient
        });

    } catch (error) {
        console.error('Error creating recipient:', error);
        res.status(500).json({
            status: false,
            message: 'Error al crear recipient',
            error: error.message
        });
    }
};

// Obtener todos los recipients con paginación y filtros
const getRecipients = async (req, res = response) => {
    try {
        const {
            page = 1,
            limit = 20,
            type,
            source,
            isActive,
            search,
            hasDevices,
            applicantId,
            ticketId,
            userId,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        const whereConditions = {};

        // Filtros
        if (type) {
            whereConditions.type = type;
        }

        if (source) {
            whereConditions.source = source;
        }

        if (isActive !== undefined) {
            whereConditions.isActive = isActive === 'true';
        }

        if (applicantId) {
            whereConditions.applicantId = applicantId;
        }

        if (ticketId) {
            whereConditions.ticketId = ticketId;
        }

        if (userId) {
            whereConditions.userId = userId;
        }

        if (hasDevices === 'true') {
            whereConditions.devices = {
                [Op.ne]: null,
                [Op.not]: '[]'
            };
        } else if (hasDevices === 'false') {
            whereConditions[Op.or] = [
                { devices: null },
                { devices: '[]' }
            ];
        }

        if (search) {
            whereConditions[Op.or] = [
                { email: { [Op.like]: `%${search}%` } },
                { firstName: { [Op.like]: `%${search}%` } },
                { lastName: { [Op.like]: `%${search}%` } },
                { phone: { [Op.like]: `%${search}%` } }
            ];
        }

        const include = [];

        // Incluir asociaciones si están disponibles
        if (applicantId || req.query.includeApplicant === 'true') {
            include.push({
                model: Applicants,
                as: 'applicant',
                required: false,
                attributes: ['IdApplicant', 'email', 'firstName', 'lastName']
            });
        }

        if (ticketId || req.query.includeTicket === 'true') {
            include.push({
                model: Tickets,
                as: 'ticket',
                required: false,
                attributes: ['IdTicket', 'IdStatus', 'createdAt']
            });
        }

        const recipients = await Recipient.findAndCountAll({
            where: whereConditions,
            include: include.length > 0 ? include : undefined,
            order: [[sortBy, sortOrder]],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        const totalPages = Math.ceil(recipients.count / limit);

        res.status(200).json({
            status: true,
            data: {
                recipients: recipients.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: totalPages,
                    totalItems: recipients.count,
                    itemsPerPage: parseInt(limit),
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Error getting recipients:', error);
        res.status(500).json({
            status: false,
            message: 'Error al obtener recipients',
            error: error.message
        });
    }
};

// Obtener recipient por ID
const getRecipientById = async (req, res = response) => {
    try {
        const { id } = req.params;

        const recipient = await Recipient.findByPk(id, {
            include: [
                {
                    model: Applicants,
                    as: 'applicant',
                    required: false,
                    attributes: ['IdApplicant', 'email', 'firstName', 'lastName', 'phone']
                },
                {
                    model: Tickets,
                    as: 'ticket',
                    required: false,
                    attributes: ['IdTicket', 'IdStatus', 'createdAt', 'updatedAt']
                }
            ]
        });

        if (!recipient) {
            return res.status(404).json({
                status: false,
                message: 'Recipient no encontrado'
            });
        }

        res.status(200).json({
            status: true,
            data: recipient
        });

    } catch (error) {
        console.error('Error getting recipient:', error);
        res.status(500).json({
            status: false,
            message: 'Error al obtener el recipient',
            error: error.message
        });
    }
};

// Actualizar recipient
const updateRecipient = async (req, res = response) => {
    try {
        const { id } = req.params;
        const {
            email,
            firstName,
            lastName,
            phone,
            type,
            source,
            devices,
            metadata,
            isActive,
            applicantId,
            ticketId,
            userId
        } = req.body;

        const recipient = await Recipient.findByPk(id);

        if (!recipient) {
            return res.status(404).json({
                status: false,
                message: 'Recipient no encontrado'
            });
        }

        // Si se cambia el email, verificar que no exista otro recipient con ese email
        if (email && email !== recipient.email) {
            const existingRecipient = await Recipient.findOne({
                where: { 
                    email: email,
                    id: { [Op.ne]: id }
                }
            });

            if (existingRecipient) {
                return res.status(400).json({
                    status: false,
                    message: 'Ya existe otro recipient con este email'
                });
            }
        }

        const updateData = {};
        if (email !== undefined) updateData.email = email;
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (phone !== undefined) updateData.phone = phone;
        if (type !== undefined) updateData.type = type;
        if (source !== undefined) updateData.source = source;
        if (devices !== undefined) updateData.devices = devices;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (applicantId !== undefined) updateData.applicantId = applicantId;
        if (ticketId !== undefined) updateData.ticketId = ticketId;
        if (userId !== undefined) updateData.userId = userId;
        
        if (metadata !== undefined) {
            updateData.metadata = {
                ...recipient.metadata,
                ...metadata,
                updatedBy: req.user_id || 'system',
                updatedAt: new Date()
            };
        }

        await recipient.update(updateData);

        res.status(200).json({
            status: true,
            message: 'Recipient actualizado exitosamente',
            data: recipient
        });

    } catch (error) {
        console.error('Error updating recipient:', error);
        res.status(500).json({
            status: false,
            message: 'Error al actualizar el recipient',
            error: error.message
        });
    }
};

// Eliminar recipient
const deleteRecipient = async (req, res = response) => {
    try {
        const { id } = req.params;

        const recipient = await Recipient.findByPk(id);

        if (!recipient) {
            return res.status(404).json({
                status: false,
                message: 'Recipient no encontrado'
            });
        }

        await recipient.destroy();

        res.status(200).json({
            status: true,
            message: 'Recipient eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error deleting recipient:', error);
        res.status(500).json({
            status: false,
            message: 'Error al eliminar el recipient',
            error: error.message
        });
    }
};

// Crear recipients desde applicants
const createFromApplicants = async (req, res = response) => {
    try {
        const {
            applicantIds = [],
            source = 'manual-import',
            metadata = {}
        } = req.body;

        if (!applicantIds || applicantIds.length === 0) {
            return res.status(400).json({
                status: false,
                message: 'Se requiere al menos un ID de applicant'
            });
        }

        // Obtener applicants
        const applicants = await Applicants.findAll({
            where: {
                IdApplicant: { [Op.in]: applicantIds }
            }
        });

        if (applicants.length === 0) {
            return res.status(404).json({
                status: false,
                message: 'No se encontraron applicants con los IDs proporcionados'
            });
        }

        // Crear recipients en lote
        const recipients = await Recipient.bulkCreateFromApplicants(
            applicants, 
            source, 
            {
                ...metadata,
                createdBy: req.user_id || 'system'
            }
        );

        res.status(201).json({
            status: true,
            message: `${recipients.length} recipients creados exitosamente`,
            data: {
                created: recipients.length,
                recipients: recipients
            }
        });

    } catch (error) {
        console.error('Error creating recipients from applicants:', error);
        res.status(500).json({
            status: false,
            message: 'Error al crear recipients desde applicants',
            error: error.message
        });
    }
};

// Crear recipients desde tickets
const createFromTickets = async (req, res = response) => {
    try {
        const {
            ticketIds = [],
            source = 'ticket-import',
            metadata = {}
        } = req.body;

        if (!ticketIds || ticketIds.length === 0) {
            return res.status(400).json({
                status: false,
                message: 'Se requiere al menos un ID de ticket'
            });
        }

        // Obtener tickets con sus applicants
        const tickets = await Tickets.findAll({
            where: {
                IdTicket: { [Op.in]: ticketIds }
            },
            include: [{
                model: Applicants,
                required: true
            }]
        });

        if (tickets.length === 0) {
            return res.status(404).json({
                status: false,
                message: 'No se encontraron tickets con los IDs proporcionados'
            });
        }

        // Crear recipients uno por uno para mantener asociación con ticket
        const recipients = [];
        for (const ticket of tickets) {
            try {
                const recipient = await Recipient.createFromTicket(
                    ticket, 
                    source, 
                    {
                        ...metadata,
                        createdBy: req.user_id || 'system'
                    }
                );
                recipients.push(recipient);
            } catch (error) {
                console.error(`Error creating recipient for ticket ${ticket.IdTicket}:`, error);
            }
        }

        res.status(201).json({
            status: true,
            message: `${recipients.length} recipients creados exitosamente`,
            data: {
                created: recipients.length,
                recipients: recipients
            }
        });

    } catch (error) {
        console.error('Error creating recipients from tickets:', error);
        res.status(500).json({
            status: false,
            message: 'Error al crear recipients desde tickets',
            error: error.message
        });
    }
};

// Gestión de devices
const addDevice = async (req, res = response) => {
    try {
        const { id } = req.params;
        const { deviceToken } = req.body;

        if (!deviceToken) {
            return res.status(400).json({
                status: false,
                message: 'deviceToken es requerido'
            });
        }

        const recipient = await Recipient.findByPk(id);

        if (!recipient) {
            return res.status(404).json({
                status: false,
                message: 'Recipient no encontrado'
            });
        }

        await recipient.addDevice(deviceToken);

        res.status(200).json({
            status: true,
            message: 'Device agregado exitosamente',
            data: {
                recipientId: id,
                devices: recipient.devices
            }
        });

    } catch (error) {
        console.error('Error adding device:', error);
        res.status(500).json({
            status: false,
            message: 'Error al agregar device',
            error: error.message
        });
    }
};

const removeDevice = async (req, res = response) => {
    try {
        const { id } = req.params;
        const { deviceToken } = req.body;

        if (!deviceToken) {
            return res.status(400).json({
                status: false,
                message: 'deviceToken es requerido'
            });
        }

        const recipient = await Recipient.findByPk(id);

        if (!recipient) {
            return res.status(404).json({
                status: false,
                message: 'Recipient no encontrado'
            });
        }

        await recipient.removeDevice(deviceToken);

        res.status(200).json({
            status: true,
            message: 'Device removido exitosamente',
            data: {
                recipientId: id,
                devices: recipient.devices
            }
        });

    } catch (error) {
        console.error('Error removing device:', error);
        res.status(500).json({
            status: false,
            message: 'Error al remover device',
            error: error.message
        });
    }
};

// Estadísticas de recipients
const getRecipientStats = async (req, res = response) => {
    try {
        const stats = await Recipient.findAll({
            attributes: [
                'type',
                'source',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
            ],
            where: { isActive: true },
            group: ['type', 'source'],
            raw: true
        });

        const totalRecipients = await Recipient.count({
            where: { isActive: true }
        });

        const recipientsWithDevices = await Recipient.count({
            where: {
                isActive: true,
                devices: {
                    [Op.ne]: null,
                    [Op.not]: '[]'
                }
            }
        });

        res.status(200).json({
            status: true,
            data: {
                total: totalRecipients,
                withDevices: recipientsWithDevices,
                withoutDevices: totalRecipients - recipientsWithDevices,
                byTypeAndSource: stats
            }
        });

    } catch (error) {
        console.error('Error getting recipient stats:', error);
        res.status(500).json({
            status: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
};

module.exports = {
    createRecipient,
    getRecipients,
    getRecipientById,
    updateRecipient,
    deleteRecipient,
    createFromApplicants,
    createFromTickets,
    addDevice,
    removeDevice,
    getRecipientStats
};
