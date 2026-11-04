const { Router } = require('express');
const { validarJWT } = require('../middlewares/jwt-check');
const {
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
    saveNotificationWithImage
} = require('../controllers/pushController');

const router = Router();

// Ruta original
router.post('/send', sendPushNotificationToDevice);

// Nuevas rutas para administración
router.get('/notifications', validarJWT, getNotifications);
router.get('/notifications/stats', validarJWT, getNotificationStats);
router.get('/notifications/:id', validarJWT, getNotificationById);
router.post('/notifications', validarJWT, saveNotification);
router.put('/notifications/:id', validarJWT, updateNotification);
router.delete('/notifications/:id', validarJWT, deleteNotification);
router.post('/notifications/:id/send', validarJWT, sendMassNotification);

router.post('/notifications/image', validarJWT, saveNotificationWithImage);

// Rutas para manejo de imágenes
router.post('/upload-image', validarJWT, uploadImage);
router.get('/images', validarJWT, getImages);
router.get('/images/:filename', getImage); // Esta ruta NO necesita JWT para mostrar imágenes
router.delete('/images/:filename', validarJWT, deleteImage);

module.exports = router;