const admin = require('firebase-admin');
const { getMessaging } = require('firebase-admin/messaging');
const {response} = require('express');
const { Op, Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const Campaign = require('../model/pushnotification'); // Renombrado a Campaign
const CampaignDelivery = require('../model/campaignDelivery');
const ApplicantMobile = require('../model/applicantMobile');
const UserGroup = require('../model/userGroup');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer para guardar imágenes (mantener igual)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads/notifications');
        
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, 'notification-' + uniqueSuffix + extension);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WebP)'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB máximo
    }
});

const uploadCampaignImage = upload.single('image');

// Inicializar Firebase una sola vez
let firebaseInitialized = false;

const initializeFirebase = () => {
    if (!firebaseInitialized && admin.apps.length === 0) {
        try {
            const serviceAccount = require('../ventanilladigital-76532-firebase-adminsdk-fbsvc-75028221d8.json');
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            firebaseInitialized = true;
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            throw error;
        }
    }
};

// CRUD Operations para Campañas

// Crear nueva campaña
const createCampaign = async (req, res = response) => {
    try {
        const {
            notificationName,
            title,
            message,
            image = null,
            status = 'draft',
            gradient = null,
            metadata = {}
        } = req.body;

        // Validaciones básicas
        if (!notificationName || !title || !message) {
            return res.status(400).json({
                status: false,
                message: 'notificationName, title y message son requeridos'
            });
        }

        const campaignId = uuidv4();

        const campaign = await Campaign.create({
            id: campaignId,
            notificationName,
            title,
            message,
            image,
            status,
            gradient,
            createdBy: req.user_id || 'system',
            metadata: {
                sourceType: metadata.sourceType || 'manual',
                sourceId: metadata.sourceId || null,
                tags: metadata.tags || []
            }
        });

        res.status(201).json({
            status: true,
            message: 'Campaña creada exitosamente',
            data: campaign
        });

    } catch (error) {
        console.error('Error creating campaign:', error);
        res.status(500).json({
            status: false,
            message: 'Error al crear la campaña',
            error: error.message
        });
    }
};

// Obtener todas las campañas con paginación y filtros
const getCampaigns = async (req, res = response) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            createdBy,
            search,
            sourceType,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        const whereConditions = {};

        // Filtros
        if (status) {
            whereConditions.status = status;
        }

        if (createdBy) {
            whereConditions.createdBy = createdBy;
        }

        if (sourceType) {
            whereConditions['metadata.sourceType'] = sourceType;
        }

        if (startDate && endDate) {
            whereConditions.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        if (search) {
            whereConditions[Op.or] = [
                { notificationName: { [Op.like]: `%${search}%` } },
                { title: { [Op.like]: `%${search}%` } },
                { message: { [Op.like]: `%${search}%` } }
            ];
        }

        const campaigns = await Campaign.findAndCountAll({
            where: whereConditions,
            order: [[sortBy, sortOrder]],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        // Obtener estadísticas de envío para cada campaña
        const campaignsWithStats = await Promise.all(
            campaigns.rows.map(async (campaign) => {
                const deliveryStats = await CampaignDelivery.findOne({
                    where: { campaignId: campaign.id },
                    attributes: [
                        [Sequelize.fn('SUM', Sequelize.col('totalRecipients')), 'totalSent'],
                        [Sequelize.fn('SUM', Sequelize.col('successCount')), 'totalSuccess'],
                        [Sequelize.fn('SUM', Sequelize.col('failureCount')), 'totalFailures']
                    ],
                    raw: true
                });

                return {
                    ...campaign.toJSON(),
                    deliveryStats: {
                        totalSent: parseInt(deliveryStats?.totalSent) || 0,
                        totalSuccess: parseInt(deliveryStats?.totalSuccess) || 0,
                        totalFailures: parseInt(deliveryStats?.totalFailures) || 0
                    }
                };
            })
        );

        const totalPages = Math.ceil(campaigns.count / limit);

        res.status(200).json({
            status: true,
            data: {
                campaigns: campaignsWithStats,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: totalPages,
                    totalItems: campaigns.count,
                    itemsPerPage: parseInt(limit),
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Error getting campaigns:', error);
        res.status(500).json({
            status: false,
            message: 'Error al obtener campañas',
            error: error.message
        });
    }
};

// Obtener campaña por ID
const getCampaignById = async (req, res = response) => {
    try {
        const { id } = req.params;

        const campaign = await Campaign.findByPk(id);

        if (!campaign) {
            return res.status(404).json({
                status: false,
                message: 'Campaña no encontrada'
            });
        }

        // Obtener historial de envíos
        const deliveries = await CampaignDelivery.findAll({
            where: { campaignId: id },
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            status: true,
            data: {
                campaign: campaign,
                deliveries: deliveries
            }
        });

    } catch (error) {
        console.error('Error getting campaign:', error);
        res.status(500).json({
            status: false,
            message: 'Error al obtener la campaña',
            error: error.message
        });
    }
};

// Actualizar campaña
const updateCampaign = async (req, res = response) => {
    try {
        const { id } = req.params;
        const {
            notificationName,
            title,
            message,
            image,
            oldImageUrl,
            status,
            gradient,
            metadata
        } = req.body;

        const campaign = await Campaign.findByPk(id);

        if (!campaign) {
            return res.status(404).json({
                status: false,
                message: 'Campaña no encontrada'
            });
        }

        // No permitir actualizar campañas ya enviadas
        if (campaign.status === 'sent') {
            return res.status(400).json({
                status: false,
                message: 'No se puede actualizar una campaña ya enviada'
            });
        }

        // Si se cambió la imagen, eliminar la anterior
        if (oldImageUrl && oldImageUrl !== image) {
            try {
                const filename = path.basename(oldImageUrl);
                const imagePath = path.join(__dirname, '../uploads/notifications', filename);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            } catch (error) {
                console.error('Error deleting old image:', error);
            }
        }

        const updateData = {};
        if (notificationName !== undefined) updateData.notificationName = notificationName;
        if (title !== undefined) updateData.title = title;
        if (message !== undefined) updateData.message = message;
        if (image !== undefined) updateData.image = image;
        if (status !== undefined) updateData.status = status;
        if (gradient !== undefined) updateData.gradient = gradient;
        if (metadata !== undefined) updateData.metadata = metadata;

        await campaign.update(updateData);

        res.status(200).json({
            status: true,
            message: 'Campaña actualizada exitosamente',
            data: campaign
        });

    } catch (error) {
        console.error('Error updating campaign:', error);
        res.status(500).json({
            status: false,
            message: 'Error al actualizar la campaña',
            error: error.message
        });
    }
};

// Eliminar campaña
const deleteCampaign = async (req, res = response) => {
    try {
        const { id } = req.params;

        const campaign = await Campaign.findByPk(id);

        if (!campaign) {
            return res.status(404).json({
                status: false,
                message: 'Campaña no encontrada'
            });
        }

        // No permitir eliminar campañas ya enviadas, solo archivar
        if (campaign.status === 'sent') {
            await campaign.update({ status: 'archived' });
            return res.status(200).json({
                status: true,
                message: 'Campaña archivada (no se puede eliminar una campaña enviada)'
            });
        }

        // Eliminar imagen asociada
        if (campaign.image) {
            try {
                const filename = path.basename(campaign.image);
                const imagePath = path.join(__dirname, '../uploads/notifications', filename);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            } catch (error) {
                console.error('Error deleting campaign image:', error);
            }
        }

        // Eliminar envíos asociados
        await CampaignDelivery.destroy({
            where: { campaignId: id }
        });

        await campaign.destroy();

        res.status(200).json({
            status: true,
            message: 'Campaña eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error deleting campaign:', error);
        res.status(500).json({
            status: false,
            message: 'Error al eliminar la campaña',
            error: error.message
        });
    }
};

// Enviar campaña
const sendCampaign = async (req, res = response) => {
    try {
        const { id } = req.params;
        const {
            recipientType,
            recipientGroups = [],
            customRecipients = [],
            deliverySettings = {},
            scheduledFor = null
        } = req.body;

        const campaign = await Campaign.findByPk(id);

        if (!campaign) {
            return res.status(404).json({
                status: false,
                message: 'Campaña no encontrada'
            });
        }

        if (campaign.status === 'sent') {
            return res.status(400).json({
                status: false,
                message: 'Esta campaña ya fue enviada'
            });
        }

        const deliveryId = uuidv4();

        // Crear registro de envío
        const delivery = await CampaignDelivery.create({
            id: deliveryId,
            campaignId: id,
            recipientType,
            recipientGroups,
            customRecipients,
            deliverySettings,
            scheduledFor,
            createdBy: req.user_id || 0,
            status: scheduledFor ? 'pending' : 'processing'
        });

        // Si es envío inmediato, procesar ahora
        if (!scheduledFor) {
            await processCampaignDelivery(delivery, campaign);
        }

        res.status(200).json({
            status: true,
            message: scheduledFor ? 'Campaña programada exitosamente' : 'Campaña enviada exitosamente',
            data: {
                deliveryId: deliveryId,
                campaignId: id,
                scheduledFor: scheduledFor
            }
        });

    } catch (error) {
        console.error('Error sending campaign:', error);
        res.status(500).json({
            status: false,
            message: 'Error al enviar la campaña',
            error: error.message
        });
    }
};

// Procesar envío de campaña
const processCampaignDelivery = async (delivery, campaign) => {
    try {
        initializeFirebase();

        await delivery.update({ status: 'processing' });

        let tokens = [];

        console.log(delivery.customRecipients);
        console.log(campaign);

        // Obtener tokens según el tipo de destinatario
        switch (delivery.recipientType) {
            case 'all':
                const allApplicants = await ApplicantMobile.findAll({
                    where: { isActive: true },
                    attributes: ['token']
                });
                tokens = allApplicants.flatMap(app => 
                    Array.isArray(app.token) ? app.token : [app.token]
                ).filter(token => token);
                break;

            case 'groups':
                if (delivery.recipientGroups && delivery.recipientGroups.length > 0) {
                    // Obtener IDs de los grupos
                    const groupIds = delivery.recipientGroups.map(group => group.id || group);
                    
                    // Buscar los grupos en la base de datos
                    const userGroups = await UserGroup.findAll({
                        where: { 
                            id: { [Op.in]: groupIds },
                            isActive: true 
                        },
                        attributes: ['id', 'name', 'members']
                    });

                    if (userGroups.length === 0) {
                        throw new Error('No se encontraron grupos válidos');
                    }

                    // Extraer todos los device tokens de todos los miembros de todos los grupos
                    const allTokens = [];
                    const memberDetails = [];

                    userGroups.forEach(group => {
                        if (group.members && Array.isArray(group.members)) {
                            group.members.forEach(member => {
                                // Verificar que el miembro tenga tokens y esté activo
                                if (member.hasDeviceTokens && member.deviceTokens && Array.isArray(member.deviceTokens)) {
                                    // Agregar cada token del miembro
                                    member.deviceTokens.forEach(token => {
                                        if (token && token.trim() !== '') {
                                            allTokens.push(token);
                                            memberDetails.push({
                                                groupId: group.id,
                                                groupName: group.name,
                                                applicantId: member.applicantId,
                                                applicantName: member.applicantName,
                                                applicantEmail: member.applicantEmail,
                                                token: token,
                                                recipientType: member.recipientType
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });

                    // Remover duplicados de tokens (por si un usuario está en múltiples grupos)
                    tokens = [...new Set(allTokens)];

                    // Guardar detalles de miembros en el delivery para auditoria
                    await delivery.update({
                        deliveryResults: {
                            ...delivery.deliveryResults,
                            targetGroups: userGroups.map(g => ({ id: g.id, name: g.name })),
                            memberDetails: memberDetails,
                            uniqueTokens: tokens.length,
                            totalMembers: memberDetails.length
                        }
                    });

                    console.log(`Tokens extraídos de grupos: ${tokens.length} únicos de ${memberDetails.length} miembros total`);
                }
                break;

            case 'custom':
    if (delivery.customRecipients && delivery.customRecipients.length > 0) {
        // Extraer todos los device tokens de todos los recipients personalizados
        const allTokens = [];
        const recipientDetails = [];

        delivery.customRecipients.forEach(recipient => {
            // Verificar que el recipient tenga devices válidos
            if (recipient.devices && Array.isArray(recipient.devices) && recipient.devices.length > 0) {
                // Agregar cada token del recipient
                console.log('Applicants: '+recipient);
                
                recipient.devices.forEach(token => {
                    if (token && token.trim() !== '') {
                        allTokens.push(token);
                        recipientDetails.push({
                            applicantId: recipient.IdApplicant,
                            applicantName: recipient.name,
                            applicantEmail: recipient.email,
                            token: token,
                            recipientType: recipient.type || 'custom',
                            metadata: {
                                phone: recipient.metadata?.phone || null,
                                ticketId: recipient.metadata?.ticketId || null,
                                ...recipient.metadata
                            }
                        });
                    }
                });
            }
        });

        // Remover duplicados de tokens (por si hay tokens repetidos)
        tokens = [...new Set(allTokens)];

        // Guardar detalles de recipients en el delivery para auditoria
        await delivery.update({
            deliveryResults: {
                ...delivery.deliveryResults,
                customRecipientsDetails: {
                    totalRecipients: delivery.customRecipients.length,
                    recipientsWithDevices: delivery.customRecipients.filter(r => r.devices && r.devices.length > 0).length,
                    uniqueTokens: tokens.length,
                    totalDevices: allTokens.length,
                    recipientDetails: recipientDetails
                }
            }
        });

        console.log(`Tokens extraídos de recipients personalizados: ${tokens.length} únicos de ${allTokens.length} dispositivos total`);
    }
    break;
        }

        if (tokens.length === 0) {
            await delivery.update({
                status: 'failed',
                deliveryResults: { error: 'No se encontraron destinatarios válidos' }
            });
            return;
        }

        // Preparar mensaje base
        const messagePayload = {
            notification: {
                title: campaign.title,
                body: campaign.message
            },
            data: {
                campaignId: campaign.id,
                deliveryId: delivery.id,
                type: 'campaign',
                timestamp: new Date().toISOString()
            }
        };

        // Agregar configuración específica para Android si hay imagen
        if (campaign.image) {
            messagePayload.android = {
                notification: {
                    imageUrl: campaign.image
                }
            };
        }

        // Agregar configuración específica para iOS si hay imagen
        if (campaign.image) {
            messagePayload.apns = {
                payload: {
                    aps: {
                        'mutable-content': 1
                    }
                },
                fcm_options: {
                    image: campaign.image
                }
            };
        }

        // Configurar prioridad y otras opciones desde deliverySettings
        const { deliverySettings = {} } = delivery;
        
        if (deliverySettings.priority) {
            messagePayload.android = {
                ...messagePayload.android,
                priority: deliverySettings.priority === 'high' ? 'high' : 'normal'
            };
            
            messagePayload.apns = {
                ...messagePayload.apns,
                headers: {
                    'apns-priority': deliverySettings.priority === 'high' ? '10' : '5'
                }
            };
        }

        // Configurar TTL (Time To Live)
        if (deliverySettings.ttl) {
            messagePayload.android = {
                ...messagePayload.android,
                ttl: deliverySettings.ttl * 1000 // Firebase espera en milisegundos
            };
        }

        // Configurar collapse key para agrupar notificaciones
        if (deliverySettings.collapseKey) {
            messagePayload.android = {
                ...messagePayload.android,
                collapseKey: deliverySettings.collapseKey
            };
        }

        // **NUEVA IMPLEMENTACIÓN CON sendEachForMulticast**
        // Enviar en lotes para manejar grandes volúmenes
        const batchSize = deliverySettings.batchSize || 500; // Máximo 500 tokens por batch
        const delayBetweenBatches = deliverySettings.delayBetweenBatches || 1000; // 1 segundo por defecto
        
        let successCount = 0;
        let failureCount = 0;
        const failedTokens = [];
        const batchResults = [];

        console.log(`Iniciando envío de ${tokens.length} notificaciones en lotes de ${batchSize}`);

        for (let i = 0; i < tokens.length; i += batchSize) {
            const batchTokens = tokens.slice(i, i + batchSize);
            const batchNumber = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(tokens.length / batchSize);
            
            console.log(`Procesando lote ${batchNumber}/${totalBatches} con ${batchTokens.length} tokens`);
            
            try {
                // Preparar mensaje para este lote
                const batchMessage = {
                    ...messagePayload,
                    tokens: batchTokens
                };

                // Usar la nueva API sendEachForMulticast
                const response = await getMessaging().sendEachForMulticast(batchMessage);
                
                successCount += response.successCount;
                failureCount += response.failureCount;

                // Procesar fallos específicos de este lote
                if (response.failureCount > 0) {
                    response.responses.forEach((resp, idx) => {
                        if (!resp.success) {
                            const failedToken = batchTokens[idx];
                            failedTokens.push({
                                token: failedToken,
                                error: resp.error?.code || 'unknown_error',
                                errorMessage: resp.error?.message || 'Error desconocido'
                            });
                        }
                    });
                }

                // Guardar resultado del lote
                batchResults.push({
                    batchNumber: batchNumber,
                    tokensCount: batchTokens.length,
                    successCount: response.successCount,
                    failureCount: response.failureCount,
                    timestamp: new Date().toISOString()
                });

                console.log(`Lote ${batchNumber} completado: ${response.successCount} éxitos, ${response.failureCount} fallos`);

                // Aplicar delay entre lotes si no es el último
                if (i + batchSize < tokens.length && delayBetweenBatches > 0) {
                    await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
                }

            } catch (error) {
                console.error(`Error en lote ${batchNumber}:`, error);
                
                // Contar todos los tokens del lote como fallos
                failureCount += batchTokens.length;
                
                // Agregar tokens del lote fallido a la lista de fallos
                batchTokens.forEach(token => {
                    failedTokens.push({
                        token: token,
                        error: 'batch_error',
                        errorMessage: error.message
                    });
                });

                batchResults.push({
                    batchNumber: batchNumber,
                    tokensCount: batchTokens.length,
                    successCount: 0,
                    failureCount: batchTokens.length,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }

        console.log(`Envío completado: ${successCount} éxitos, ${failureCount} fallos de ${tokens.length} total`);

        // Actualizar delivery con resultados finales
        const deliveryResults = {
            batchResults: batchResults,
            failedTokens: failedTokens,
            summary: {
                totalTokens: tokens.length,
                successCount: successCount,
                failureCount: failureCount,
                successRate: ((successCount / tokens.length) * 100).toFixed(2) + '%',
                totalBatches: batchResults.length,
                processingTime: new Date() - new Date(delivery.createdAt) + 'ms'
            },
            errors: {
                invalidTokens: failedTokens.filter(f => f.error === 'invalid-registration-token').length,
                unregisteredTokens: failedTokens.filter(f => f.error === 'unregistered').length,
                quotaExceeded: failedTokens.filter(f => f.error === 'quota-exceeded').length,
                other: failedTokens.filter(f => !['invalid-registration-token', 'unregistered', 'quota-exceeded'].includes(f.error)).length
            }
        };

        await delivery.update({
            status: failureCount === tokens.length ? 'failed' : 'completed',
            sentAt: new Date(),
            totalRecipients: tokens.length,
            successCount: successCount,
            failureCount: failureCount,
            deliveryResults: deliveryResults
        });

        // Actualizar estado de la campaña
        await campaign.update({ 
            status: 'sent',
            lastSentAt: new Date()
        });

        // Log final
        console.log(`Campaña ${campaign.id} procesada: ${successCount}/${tokens.length} enviadas exitosamente`);

    } catch (error) {
        console.error('Error processing campaign delivery:', error);
        await delivery.update({
            status: 'failed',
            deliveryResults: { 
                error: error.message,
                timestamp: new Date().toISOString()
            }
        });
        throw error;
    }
};

// Funciones de imagen (mantener las existentes)
const uploadImage = async (req, res = response) => {
    uploadCampaignImage(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    status: false,
                    message: 'El archivo es demasiado grande. Máximo 5MB permitido.'
                });
            }
            return res.status(400).json({
                status: false,
                message: 'Error al subir archivo: ' + err.message
            });
        } else if (err) {
            return res.status(400).json({
                status: false,
                message: err.message
            });
        }

        if (!req.file) {
            return res.status(400).json({
                status: false,
                message: 'No se proporcionó ningún archivo'
            });
        }

        const baseUrl = process.env.URL_UPLOAD_DEV || 'http://localhost:3000';
        const imageUrl = `${baseUrl}/api/campaigns/images/${req.file.filename}`;

        res.status(200).json({
            status: true,
            message: 'Imagen subida exitosamente',
            data: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                imageUrl: imageUrl,
                fullPath: req.file.path
            }
        });
    });
};

const getImage = async (req, res = response) => {
    try {
        const { filename } = req.params;
        const imagePath = path.join(__dirname, '../uploads/notifications', filename);

        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({
                status: false,
                message: 'Imagen no encontrada'
            });
        }

        const ext = path.extname(filename).toLowerCase();
        let contentType = 'image/jpeg';

        switch (ext) {
            case '.png':
                contentType = 'image/png';
                break;
            case '.gif':
                contentType = 'image/gif';
                break;
            case '.webp':
                contentType = 'image/webp';
                break;
            case '.jpg':
            case '.jpeg':
            default:
                contentType = 'image/jpeg';
                break;
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.sendFile(imagePath);

    } catch (error) {
        console.error('Error getting image:', error);
        res.status(500).json({
            status: false,
            message: 'Error al obtener la imagen',
            error: error.message
        });
    }
};

const deleteImage = async (req, res = response) => {
    try {
        const { filename } = req.params;
        const imagePath = path.join(__dirname, '../uploads/notifications', filename);

        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({
                status: false,
                message: 'Imagen no encontrada'
            });
        }

        // Verificar si está siendo usada
        const campaignUsingImage = await Campaign.findOne({
            where: {
                image: {
                    [Op.like]: `%${filename}%`
                }
            }
        });

        if (campaignUsingImage) {
            return res.status(400).json({
                status: false,
                message: 'No se puede eliminar la imagen porque está siendo usada por una campaña',
                data: {
                    campaignId: campaignUsingImage.id,
                    campaignName: campaignUsingImage.notificationName
                }
            });
        }

        fs.unlinkSync(imagePath);

        res.status(200).json({
            status: true,
            message: 'Imagen eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({
            status: false,
            message: 'Error al eliminar la imagen',
            error: error.message
        });
    }
};

const getImages = async (req, res = response) => {
    try {
        const uploadsPath = path.join(__dirname, '../uploads/notifications');
        
        if (!fs.existsSync(uploadsPath)) {
            fs.mkdirSync(uploadsPath, { recursive: true });
            return res.status(200).json({
                status: true,
                data: { images: [] }
            });
        }

        const files = fs.readdirSync(uploadsPath);
        const baseUrl = process.env.URL_UPLOAD_DEV || 'http://localhost:3000';
        
        const images = files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
            })
            .map(file => {
                const filePath = path.join(uploadsPath, file);
                const stats = fs.statSync(filePath);
                
                return {
                    filename: file,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    modifiedAt: stats.mtime,
                    imageUrl: `${baseUrl}/api/campaigns/images/${file}`
                };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json({
            status: true,
            data: {
                images: images,
                total: images.length
            }
        });

    } catch (error) {
        console.error('Error getting images list:', error);
        res.status(500).json({
            status: false,
            message: 'Error al obtener la lista de imágenes',
            error: error.message
        });
    }
};

// Estadísticas de campañas
const getCampaignStats = async (req, res = response) => {
    try {
        const stats = await Campaign.findAll({
            attributes: [
                'status',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
            ],
            group: ['status'],
            raw: true
        });

        const deliveryStats = await CampaignDelivery.findOne({
            attributes: [
                [Sequelize.fn('SUM', Sequelize.col('totalRecipients')), 'totalSent'],
                [Sequelize.fn('SUM', Sequelize.col('successCount')), 'totalSuccess'],
                [Sequelize.fn('SUM', Sequelize.col('failureCount')), 'totalFailures']
            ],
            raw: true
        });

        res.status(200).json({
            status: true,
            data: {
                campaignStats: stats,
                deliveryStats: {
                    totalSent: parseInt(deliveryStats?.totalSent) || 0,
                    totalSuccess: parseInt(deliveryStats?.totalSuccess) || 0,
                    totalFailures: parseInt(deliveryStats?.totalFailures) || 0
                }
            }
        });

    } catch (error) {
        console.error('Error getting campaign stats:', error);
        res.status(500).json({
            status: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
};

// Agregar estas funciones al campaignController.js

// Obtener detalle completo de una campaña con todos sus envíos y destinatarios
const getCampaignDetail = async (req, res = response) => {
    try {
        const { id } = req.params;
        const {
            page = 1,
            limit = 50,
            deliveryId, // Filtrar por envío específico
            recipientType,
            status, // success, failed
            search
        } = req.query;

        const campaign = await Campaign.findByPk(id);

        if (!campaign) {
            return res.status(404).json({
                status: false,
                message: 'Campaña no encontrada'
            });
        }

        // Filtros para deliveries
        const deliveryWhere = { campaignId: id };
        if (deliveryId) {
            deliveryWhere.id = deliveryId;
        }

        // Obtener todos los envíos de la campaña
        const deliveries = await CampaignDelivery.findAll({
            where: deliveryWhere,
            order: [['createdAt', 'DESC']]
        });

        if (deliveries.length === 0) {
            return res.status(200).json({
                status: true,
                data: {
                    campaign: campaign,
                    deliveries: [],
                    recipients: [],
                    pagination: {
                        currentPage: 1,
                        totalPages: 0,
                        totalItems: 0,
                        itemsPerPage: parseInt(limit)
                    },
                    statistics: {
                        totalDeliveries: 0,
                        totalRecipients: 0,
                        totalSuccess: 0,
                        totalFailures: 0
                    }
                }
            });
        }

        // Extraer todos los destinatarios de todos los envíos
        let allRecipients = [];

        deliveries.forEach(delivery => {
            let deliveryRecipients = [];

            // Procesar según el tipo de destinatario
            switch (delivery.recipientType) {
                case 'groups':
                    if (delivery.deliveryResults?.memberDetails) {
                        deliveryRecipients = delivery.deliveryResults.memberDetails.map(member => ({
                            deliveryId: delivery.id,
                            deliveryDate: delivery.sentAt || delivery.createdAt,
                            applicantId: member.applicantId,
                            applicantName: member.applicantName,
                            applicantEmail: member.applicantEmail,
                            token: member.token,
                            recipientType: member.recipientType,
                            groupId: member.groupId,
                            groupName: member.groupName,
                            source: 'group',
                            deliveryStatus: 'pending' // Se actualizará después
                        }));
                    }
                    break;

                case 'custom':
                    if (delivery.deliveryResults?.customRecipientsDetails?.recipientDetails) {
                        deliveryRecipients = delivery.deliveryResults.customRecipientsDetails.recipientDetails.map(recipient => ({
                            deliveryId: delivery.id,
                            deliveryDate: delivery.sentAt || delivery.createdAt,
                            applicantId: recipient.applicantId,
                            applicantName: recipient.applicantName,
                            applicantEmail: recipient.applicantEmail,
                            token: recipient.token,
                            recipientType: recipient.recipientType,
                            metadata: recipient.metadata,
                            source: 'custom',
                            deliveryStatus: 'pending' // Se actualizará después
                        }));
                    }
                    break;

                case 'all':
                    // Para 'all' mostrar estadísticas generales
                    deliveryRecipients = [{
                        deliveryId: delivery.id,
                        deliveryDate: delivery.sentAt || delivery.createdAt,
                        recipientType: 'all_users',
                        source: 'all',
                        description: 'Envío masivo a todos los usuarios activos',
                        totalTokens: delivery.totalRecipients || 0,
                        deliveryStatus: delivery.status
                    }];
                    break;
            }

            // Mapear tokens fallidos para determinar estado de cada destinatario
            const failedTokensMap = new Map();
            if (delivery.deliveryResults?.failedTokens) {
                delivery.deliveryResults.failedTokens.forEach(ft => {
                    failedTokensMap.set(ft.token, {
                        error: ft.error,
                        errorMessage: ft.errorMessage
                    });
                });
            }

            // Actualizar estado de envío para cada destinatario
            deliveryRecipients = deliveryRecipients.map(recipient => {
                if (recipient.token) {
                    const failure = failedTokensMap.get(recipient.token);
                    return {
                        ...recipient,
                        deliveryStatus: failure ? 'failed' : 'success',
                        failureReason: failure?.errorMessage || null,
                        errorCode: failure?.error || null
                    };
                }
                return recipient;
            });

            allRecipients = allRecipients.concat(deliveryRecipients);
        });

        // Aplicar filtros
        let filteredRecipients = allRecipients;

        if (recipientType && recipientType !== 'all') {
            filteredRecipients = filteredRecipients.filter(r => r.recipientType === recipientType);
        }

        if (status && status !== 'all') {
            filteredRecipients = filteredRecipients.filter(r => r.deliveryStatus === status);
        }

        if (search) {
            const searchLower = search.toLowerCase();
            filteredRecipients = filteredRecipients.filter(r => 
                (r.applicantName && r.applicantName.toLowerCase().includes(searchLower)) ||
                (r.applicantEmail && r.applicantEmail.toLowerCase().includes(searchLower)) ||
                (r.groupName && r.groupName.toLowerCase().includes(searchLower))
            );
        }

        // Aplicar paginación
        const offset = (page - 1) * limit;
        const paginatedRecipients = filteredRecipients.slice(offset, offset + parseInt(limit));
        const totalPages = Math.ceil(filteredRecipients.length / limit);

        // Calcular estadísticas de la campaña
        const campaignStats = {
            totalDeliveries: deliveries.length,
            totalRecipients: deliveries.reduce((sum, d) => sum + (d.totalRecipients || 0), 0),
            totalSuccess: deliveries.reduce((sum, d) => sum + (d.successCount || 0), 0),
            totalFailures: deliveries.reduce((sum, d) => sum + (d.failureCount || 0), 0),
            byDelivery: deliveries.map(d => ({
                deliveryId: d.id,
                recipientType: d.recipientType,
                status: d.status,
                sentAt: d.sentAt,
                totalRecipients: d.totalRecipients || 0,
                successCount: d.successCount || 0,
                failureCount: d.failureCount || 0,
                successRate: d.deliveryResults?.summary?.successRate || '0%'
            })),
            byRecipientType: {},
            byStatus: {
                success: filteredRecipients.filter(r => r.deliveryStatus === 'success').length,
                failed: filteredRecipients.filter(r => r.deliveryStatus === 'failed').length,
                pending: filteredRecipients.filter(r => r.deliveryStatus === 'pending').length
            }
        };

        // Estadísticas por tipo de destinatario
        const typeGroups = allRecipients.reduce((acc, r) => {
            const type = r.recipientType || 'unknown';
            if (!acc[type]) acc[type] = { total: 0, success: 0, failed: 0 };
            acc[type].total++;
            if (r.deliveryStatus === 'success') acc[type].success++;
            if (r.deliveryStatus === 'failed') acc[type].failed++;
            return acc;
        }, {});

        campaignStats.byRecipientType = typeGroups;

        // Análisis de errores más comunes
        const errorAnalysis = {};
        deliveries.forEach(delivery => {
            if (delivery.deliveryResults?.failedTokens) {
                delivery.deliveryResults.failedTokens.forEach(ft => {
                    const error = ft.error || 'unknown_error';
                    errorAnalysis[error] = (errorAnalysis[error] || 0) + 1;
                });
            }
        });

        const topErrors = Object.entries(errorAnalysis)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([error, count]) => ({ error, count }));

        res.status(200).json({
            status: true,
            data: {
                campaign: {
                    id: campaign.id,
                    notificationName: campaign.notificationName,
                    title: campaign.title,
                    message: campaign.message,
                    image: campaign.image,
                    status: campaign.status,
                    createdAt: campaign.createdAt,
                    lastSentAt: campaign.lastSentAt
                },
                deliveries: campaignStats.byDelivery,
                recipients: paginatedRecipients,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: totalPages,
                    totalItems: filteredRecipients.length,
                    itemsPerPage: parseInt(limit),
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                },
                statistics: {
                    ...campaignStats,
                    overallSuccessRate: campaignStats.totalRecipients > 0 ? 
                        ((campaignStats.totalSuccess / campaignStats.totalRecipients) * 100).toFixed(2) + '%' : 
                        '0%',
                    topErrors: topErrors,
                    lastDelivery: deliveries[0] // El más reciente
                }
            }
        });

    } catch (error) {
        console.error('Error getting campaign detail:', error);
        res.status(500).json({
            status: false,
            message: 'Error al obtener detalle de la campaña',
            error: error.message
        });
    }
};

// Obtener historial resumido de envíos de una campaña
const getCampaignHistory = async (req, res = response) => {
    try {
        const { id } = req.params;
        const {
            page = 1,
            limit = 20,
            status,
            recipientType,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        const campaign = await Campaign.findByPk(id);

        if (!campaign) {
            return res.status(404).json({
                status: false,
                message: 'Campaña no encontrada'
            });
        }

        const offset = (page - 1) * limit;
        const whereConditions = { campaignId: id };

        // Filtros
        if (status) {
            whereConditions.status = status;
        }

        if (recipientType) {
            whereConditions.recipientType = recipientType;
        }

        if (startDate && endDate) {
            whereConditions.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        const deliveries = await CampaignDelivery.findAndCountAll({
            where: whereConditions,
            order: [[sortBy, sortOrder]],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        // Enriquecer cada delivery con información resumida
        const enrichedDeliveries = deliveries.rows.map(delivery => {
            const summary = delivery.deliveryResults?.summary || {};
            
            // Información de grupos objetivo
            let targetInfo = {};
            if (delivery.recipientType === 'groups' && delivery.deliveryResults?.targetGroups) {
                targetInfo.groups = delivery.deliveryResults.targetGroups;
            }
            if (delivery.recipientType === 'custom' && delivery.deliveryResults?.customRecipientsDetails) {
                targetInfo.customRecipients = delivery.deliveryResults.customRecipientsDetails.totalRecipients;
            }

            // Top 3 errores más comunes
            const errorCounts = {};
            if (delivery.deliveryResults?.failedTokens) {
                delivery.deliveryResults.failedTokens.forEach(ft => {
                    const error = ft.error || 'unknown_error';
                    errorCounts[error] = (errorCounts[error] || 0) + 1;
                });
            }

            const topErrors = Object.entries(errorCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([error, count]) => ({ error, count }));

            return {
                id: delivery.id,
                recipientType: delivery.recipientType,
                status: delivery.status,
                createdAt: delivery.createdAt,
                sentAt: delivery.sentAt,
                scheduledFor: delivery.scheduledFor,
                totalRecipients: delivery.totalRecipients || 0,
                successCount: delivery.successCount || 0,
                failureCount: delivery.failureCount || 0,
                successRate: summary.successRate || '0%',
                processingTime: summary.processingTime || 'N/A',
                totalBatches: summary.totalBatches || 0,
                targetInfo: targetInfo,
                topErrors: topErrors,
                deliverySettings: delivery.deliverySettings,
                createdBy: delivery.createdBy
            };
        });

        const totalPages = Math.ceil(deliveries.count / limit);

        // Estadísticas resumidas de la campaña
        const allDeliveries = await CampaignDelivery.findAll({
            where: { campaignId: id },
            attributes: [
                'status',
                'recipientType',
                'totalRecipients',
                'successCount',
                'failureCount',
                'sentAt'
            ]
        });

        const quickStats = {
            totalDeliveries: allDeliveries.length,
            totalSent: allDeliveries.reduce((sum, d) => sum + (d.totalRecipients || 0), 0),
            totalSuccess: allDeliveries.reduce((sum, d) => sum + (d.successCount || 0), 0),
            totalFailures: allDeliveries.reduce((sum, d) => sum + (d.failureCount || 0), 0),
            byStatus: allDeliveries.reduce((acc, d) => {
                acc[d.status] = (acc[d.status] || 0) + 1;
                return acc;
            }, {}),
            byRecipientType: allDeliveries.reduce((acc, d) => {
                acc[d.recipientType] = (acc[d.recipientType] || 0) + 1;
                return acc;
            }, {}),
            firstSent: allDeliveries.find(d => d.sentAt)?.sentAt || null,
            lastSent: allDeliveries.filter(d => d.sentAt).sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))[0]?.sentAt || null
        };

        quickStats.overallSuccessRate = quickStats.totalSent > 0 ? 
            ((quickStats.totalSuccess / quickStats.totalSent) * 100).toFixed(2) + '%' : 
            '0%';

        res.status(200).json({
            status: true,
            data: {
                campaign: {
                    id: campaign.id,
                    notificationName: campaign.notificationName,
                    title: campaign.title,
                    status: campaign.status,
                    createdAt: campaign.createdAt,
                    lastSentAt: campaign.lastSentAt
                },
                deliveries: enrichedDeliveries,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: totalPages,
                    totalItems: deliveries.count,
                    itemsPerPage: parseInt(limit),
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                },
                quickStats: quickStats
            }
        });

    } catch (error) {
        console.error('Error getting campaign history:', error);
        res.status(500).json({
            status: false,
            message: 'Error al obtener historial de la campaña',
            error: error.message
        });
    }
};


module.exports = {
    createCampaign,
    getCampaigns,
    getCampaignById,
    updateCampaign,
    deleteCampaign,
    sendCampaign,
    uploadImage,
    getImage,
    deleteImage,
    getImages,
    getCampaignStats,
    getCampaignDetail,      // Nueva función
    getCampaignHistory
};
