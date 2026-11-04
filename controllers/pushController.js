const admin = require('firebase-admin');
const {response} = require('express');
const { Op } = require('sequelize');
const PushNotification = require('../model/pushnotification');
const ApplicantMobile = require('../model/applicantMobile');

const multer = require('multer');
const path = require('path');
const fs = require('fs');


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

// Función original para enviar notificación a un dispositivo
const sendPushNotificationToDevice = async(req, res = response) => {
    try {
        initializeFirebase();

        const msg = {
            notification: {
                title: req.body.title,
                body: req.body.body
            },
            token: req.body.token,
            data: req.body.data || {}
        };

        if (req.body.imageUrl) {
            msg.android = {
                notification: {
                    imageUrl: req.body.imageUrl
                }
            };
        }

        const response = await admin.messaging().send(msg);
        
        console.log('Successfully sent message:', response);
        res.status(200).json({
            ok: true,
            message: 'Notification sent successfully',
            response: response
        });

    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({
            ok: false,
            message: 'Error sending notification',
            error: error.message
        });
    }
};

// Obtener todas las notificaciones con filtros
const getNotifications = async (req, res = response) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            recipientType,
            deliveryOption,
            startDate,
            endDate,
            search,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        console.log(req.query);
        
        const offset = (page - 1) * limit;
        const whereConditions = {};

        // Filtros
        if (status) {
            whereConditions.status = status;
        }

        if (recipientType) {
            whereConditions.recipientType = recipientType;
        }

        if (deliveryOption) {
            whereConditions.deliveryOption = deliveryOption;
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

        const notifications = await PushNotification.findAndCountAll({
            where: whereConditions,
            order: [[sortBy, sortOrder]],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        const totalPages = Math.ceil(notifications.count / limit);

        res.status(200).json({
            status: true,
            data: {
                notifications: notifications.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: totalPages,
                    totalItems: notifications.count,
                    itemsPerPage: parseInt(limit),
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({
            status: false,
            message: 'Error al obtener notificaciones',
            error: error.message
        });
    }
};

// Obtener una notificación por ID
const getNotificationById = async (req, res = response) => {
    try {
        const { id } = req.params;

        const notification = await PushNotification.findByPk(id);

        if (!notification) {
            return res.status(404).json({
                status: false,
                message: 'Notificación no encontrada'
            });
        }

        res.status(200).json({
            status: true,
            data: notification
        });

    } catch (error) {
        console.error('Error getting notification by ID:', error);
        res.status(500).json({
            status: false,
            message: 'Error al obtener la notificación',
            error: error.message
        });
    }
};

// Crear nueva notificación
const saveNotification = async (req, res = response) => {
    try {
        const {
            notificationName,
            title,
            message,
            status = 'draft',
            scheduledFor,
            gradient,
            image,
            recipientType = 'all',
            preSelectedRecipients,
            selectedGroups,
            deliveryOption = 'immediate',
            scheduleDate,
            scheduleTime,
            totalRecipients,
            audienceDescription,
            createdBy
        } = req.body;

        // Validaciones básicas
        if (!notificationName || !title || !message) {
            return res.status(400).json({
                status: false,
                message: 'notificationName, title y message son requeridos'
            });
        }

        // Si es programada, validar fecha
        if (deliveryOption === 'schedule' && !scheduledFor && !scheduleDate) {
            return res.status(400).json({
                status: false,
                message: 'Para notificaciones programadas se requiere scheduledFor o scheduleDate'
            });
        }

        const notification = await PushNotification.create({
            notificationName,
            title,
            message,
            status,
            scheduledFor,
            gradient,
            image,
            recipientType,
            preSelectedRecipients,
            selectedGroups,
            deliveryOption,
            scheduleDate,
            scheduleTime,
            totalRecipients,
            audienceDescription,
            createdBy
        });

        res.status(201).json({
            status: true,
            message: 'Notificación creada exitosamente',
            data: notification
        });

    } catch (error) {
        console.error('Error saving notification:', error);
        res.status(500).json({
            status: false,
            message: 'Error al guardar la notificación',
            error: error.message
        });
    }
};

// Actualizar notificación
const updateNotification = async (req, res = response) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const notification = await PushNotification.findByPk(id);

        if (!notification) {
            return res.status(404).json({
                status: false,
                message: 'Notificación no encontrada'
            });
        }

        // No permitir actualizar notificaciones ya enviadas
        if (notification.status === 'sent') {
            return res.status(400).json({
                status: false,
                message: 'No se puede actualizar una notificación ya enviada'
            });
        }

        await notification.update(updateData);

        res.status(200).json({
            status: true,
            message: 'Notificación actualizada exitosamente',
            data: notification
        });

    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).json({
            status: false,
            message: 'Error al actualizar la notificación',
            error: error.message
        });
    }
};

// Eliminar notificación
const deleteNotification = async (req, res = response) => {
    try {
        const { id } = req.params;

        const notification = await PushNotification.findByPk(id);

        if (!notification) {
            return res.status(404).json({
                status: false,
                message: 'Notificación no encontrada'
            });
        }

        // No permitir eliminar notificaciones ya enviadas
        if (notification.status === 'sent') {
            return res.status(400).json({
                status: false,
                message: 'No se puede eliminar una notificación ya enviada'
            });
        }

        await notification.destroy();

        res.status(200).json({
            status: true,
            message: 'Notificación eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            status: false,
            message: 'Error al eliminar la notificación',
            error: error.message
        });
    }
};

// Enviar notificación masiva
const sendMassNotification = async (req, res = response) => {
    try {
        const { id } = req.params;
        const { testMode = false } = req.body;

        initializeFirebase();

        const notification = await PushNotification.findByPk(id);

        if (!notification) {
            return res.status(404).json({
                status: false,
                message: 'Notificación no encontrada'
            });
        }

        if (notification.status === 'sent') {
            return res.status(400).json({
                status: false,
                message: 'Esta notificación ya fue enviada'
            });
        }

        // Obtener tokens según el tipo de destinatario
        let tokens = [];
        
        switch (notification.recipientType) {
            case 'all':
                const allApplicants = await ApplicantMobile.findAll({
                    where: { isActive: true },
                    attributes: ['token']
                });
                tokens = allApplicants.flatMap(app => 
                    Array.isArray(app.token) ? app.token : [app.token]
                ).filter(token => token);
                break;

            case 'custom':
                if (notification.preSelectedRecipients && notification.preSelectedRecipients.length > 0) {
                    const recipientIds = notification.preSelectedRecipients.map(r => r.id);
                    const customApplicants = await ApplicantMobile.findAll({
                        where: { 
                            IdApplicant: { [Op.in]: recipientIds },
                            isActive: true 
                        },
                        attributes: ['token']
                    });
                    tokens = customApplicants.flatMap(app => 
                        Array.isArray(app.token) ? app.token : [app.token]
                    ).filter(token => token);
                }
                break;

            default:
                tokens = [];
        }

        if (tokens.length === 0) {
            return res.status(400).json({
                status: false,
                message: 'No se encontraron destinatarios válidos'
            });
        }

        if (testMode) {
            return res.status(200).json({
                status: true,
                message: 'Modo de prueba - Notificación no enviada',
                data: {
                    totalRecipients: tokens.length,
                    notification: notification
                }
            });
        }

        // Preparar mensaje
        const message = {
            notification: {
                title: notification.title,
                body: notification.message
            },
            data: {
                notificationId: notification.id.toString(),
                type: 'mass_notification'
            }
        };

        if (notification.image) {
            message.android = {
                notification: {
                    imageUrl: notification.image
                }
            };
        }

        // Enviar en lotes de 500 (límite de Firebase)
        const batchSize = 500;
        const results = [];
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < tokens.length; i += batchSize) {
            const batch = tokens.slice(i, i + batchSize);
            
            try {
                const response = await admin.messaging().sendMulticast({
                    ...message,
                    tokens: batch
                });
                
                successCount += response.successCount;
                failureCount += response.failureCount;
                results.push(response);
            } catch (error) {
                console.error('Error sending batch:', error);
                failureCount += batch.length;
            }
        }

        // Actualizar notificación
        await notification.update({
            status: 'sent',
            sentAt: new Date(),
            totalRecipients: tokens.length
        });

        res.status(200).json({
            status: true,
            message: 'Notificación enviada exitosamente',
            data: {
                totalSent: successCount,
                totalFailed: failureCount,
                totalRecipients: tokens.length,
                notification: notification
            }
        });

    } catch (error) {
        // Marcar como fallida si hay error
        if (req.params.id) {
            await PushNotification.update(
                { status: 'failed' },
                { where: { id: req.params.id } }
            );
        }

        console.error('Error sending mass notification:', error);
        res.status(500).json({
            status: false,
            message: 'Error al enviar la notificación masiva',
            error: error.message
        });
    }
};

// Obtener estadísticas de notificaciones
const getNotificationStats = async (req, res = response) => {
    try {
        const stats = await PushNotification.findAll({
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['status'],
            raw: true
        });

        const totalRecipients = await PushNotification.sum('totalRecipients', {
            where: { status: 'sent' }
        });

        res.status(200).json({
            status: true,
            data: {
                statusStats: stats,
                totalRecipients: totalRecipients || 0
            }
        });

    } catch (error) {
        console.error('Error getting notification stats:', error);
        res.status(500).json({
            status: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads/notifications');
        
        // Crear directorio si no existe
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generar nombre único para el archivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, 'notification-' + uniqueSuffix + extension);
    }
});

// Filtro para validar tipos de archivo
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WebP)'), false);
    }
};

// Configuración de multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB máximo
    }
});

// Middleware de multer para subir imagen
const uploadNotificationImage = upload.single('image');

// Función para subir imagen de notificación
const uploadImage = async (req, res = response) => {
    uploadNotificationImage(req, res, function (err) {
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
        // Generar URL para acceder a la imagen
        const imageUrl = `${baseUrl}/api/notifications/images/${req.file.filename}`;

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

// Función para obtener imagen por nombre de archivo
const getImage = async (req, res = response) => {
    try {
        const { filename } = req.params;
        const imagePath = path.join(__dirname, '../uploads/notifications', filename);

        // Verificar si el archivo existe
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({
                status: false,
                message: 'Imagen no encontrada'
            });
        }

        // Verificar extensión del archivo para determinar el content-type
        const ext = path.extname(filename).toLowerCase();
        let contentType = 'image/jpeg'; // default

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

        // Configurar headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache por 1 año

        // Enviar el archivo
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

// Función para eliminar imagen
const deleteImage = async (req, res = response) => {
    try {
        const { filename } = req.params;
        const imagePath = path.join(__dirname, '../uploads/notifications', filename);

        // Verificar si el archivo existe
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({
                status: false,
                message: 'Imagen no encontrada'
            });
        }

        // Verificar si la imagen está siendo usada por alguna notificación
        const notificationUsingImage = await PushNotification.findOne({
            where: {
                image: {
                    [Op.like]: `%${filename}%`
                }
            }
        });

        if (notificationUsingImage) {
            return res.status(400).json({
                status: false,
                message: 'No se puede eliminar la imagen porque está siendo usada por una notificación',
                data: {
                    notificationId: notificationUsingImage.id,
                    notificationName: notificationUsingImage.notificationName
                }
            });
        }

        // Eliminar el archivo
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

// Función para listar todas las imágenes disponibles
const getImages = async (req, res = response) => {
    try {
        const uploadsPath = path.join(__dirname, '../uploads/notifications');
        
        // Crear directorio si no existe
        if (!fs.existsSync(uploadsPath)) {
            fs.mkdirSync(uploadsPath, { recursive: true });
            return res.status(200).json({
                status: true,
                data: {
                    images: []
                }
            });
        }

        // Leer archivos del directorio
        const files = fs.readdirSync(uploadsPath);
        const baseUrl = process.env.URL_UPLOAD_DEV || 'http://localhost:3000';

        
        // Filtrar solo archivos de imagen y obtener información
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
                    imageUrl: `${baseUrl}/api/notifications/images/${file}`
                };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Ordenar por más reciente

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

// Actualizar la función saveNotification para manejar la URL de imagen
const saveNotificationWithImage = async (req, res = response) => {
    try {
        const {
            notificationName,
            title,
            message,
            status = 'draft',
            scheduledFor,
            gradient,
            image, // Esta será la URL completa de la imagen
            recipientType = 'all',
            preSelectedRecipients,
            selectedGroups,
            deliveryOption = 'immediate',
            scheduleDate,
            scheduleTime,
            totalRecipients,
            audienceDescription,
            createdBy
        } = req.body;

        // Validaciones básicas
        if (!notificationName || !title || !message) {
            return res.status(400).json({
                status: false,
                message: 'notificationName, title y message son requeridos'
            });
        }

        // Si es programada, validar fecha
        if (deliveryOption === 'schedule' && !scheduledFor && !scheduleDate) {
            return res.status(400).json({
                status: false,
                message: 'Para notificaciones programadas se requiere scheduledFor o scheduleDate'
            });
        }

        const notification = await PushNotification.create({
            notificationName,
            title,
            message,
            status,
            scheduledFor,
            gradient,
            image, // Guardar la URL completa de la imagen
            recipientType,
            preSelectedRecipients,
            selectedGroups,
            deliveryOption,
            scheduleDate,
            scheduleTime,
            totalRecipients,
            audienceDescription,
            createdBy
        });

        res.status(201).json({
            status: true,
            message: 'Notificación creada exitosamente',
            data: notification
        });

    } catch (error) {
        console.error('Error saving notification:', error);
        res.status(500).json({
            status: false,
            message: 'Error al guardar la notificación',
            error: error.message
        });
    }
};


// Agregar función para enviar a grupos
const sendNotificationToGroup = async (req, res = response) => {
    try {
        const { groupId, title, message, image, data = {} } = req.body;

        if (!groupId || !title || !message) {
            return res.status(400).json({
                status: false,
                message: 'groupId, title y message son requeridos'
            });
        }

        initializeFirebase();

        // Obtener miembros del grupo con sus tokens
        const groupMembersResponse = await fetch(`${process.env.URL_UPLOAD_DEV}/api/user-groups/groups/${groupId}/members?includeTokens=true&limit=10000`, {
            headers: {
                'Authorization': req.headers.authorization
            }
        });

        const groupMembersData = await groupMembersResponse.json();
        
        if (!groupMembersData.status) {
            return res.status(400).json({
                status: false,
                message: 'Error al obtener miembros del grupo'
            });
        }

        // Extraer todos los tokens
        const allTokens = groupMembersData.data.members
            .filter(member => member.tokens && member.tokens.length > 0)
            .flatMap(member => member.tokens);

        if (allTokens.length === 0) {
            return res.status(400).json({
                status: false,
                message: 'No se encontraron tokens válidos en el grupo'
            });
        }

        // Preparar mensaje
        const messagePayload = {
            notification: {
                title: title,
                body: message
            },
            data: {
                groupId: groupId,
                type: 'group_notification',
                ...data
            }
        };

        if (image) {
            messagePayload.android = {
                notification: {
                    imageUrl: image
                }
            };
        }

        // Enviar en lotes
        const batchSize = 500;
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < allTokens.length; i += batchSize) {
            const batch = allTokens.slice(i, i + batchSize);
            
            try {
                const response = await admin.messaging().sendMulticast({
                    ...messagePayload,
                    tokens: batch
                });
                
                successCount += response.successCount;
                failureCount += response.failureCount;
            } catch (error) {
                console.error('Error sending batch:', error);
                failureCount += batch.length;
            }
        }

        res.status(200).json({
            status: true,
            message: 'Notificación enviada al grupo exitosamente',
            data: {
                groupId,
                groupName: groupMembersData.data.group.name,
                totalSent: successCount,
                totalFailed: failureCount,
                totalTokens: allTokens.length
            }
        });

    } catch (error) {
        console.error('Error sending notification to group:', error);
        res.status(500).json({
            status: false,
            message: 'Error al enviar notificación al grupo',
            error: error.message
        });
    }
};


module.exports = {
    sendPushNotificationToDevice,
    getNotifications,
    getNotificationById,
    saveNotification,
    updateNotification,
    deleteNotification,
    sendMassNotification,
    getNotificationStats,
    uploadImage,
    getImage,
    deleteImage,
    getImages,
    uploadNotificationImage,
    saveNotificationWithImage,
    sendNotificationToGroup
};