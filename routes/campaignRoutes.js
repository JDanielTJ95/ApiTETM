const { Router } = require('express');
const { validarJWT } = require('../middlewares/jwt-check');
const {
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
    getCampaignDetail,
    getCampaignHistory
} = require('../controllers/campaignController');

const router = Router();
router.get('/images/:filename', getImage); 
// Aplicar autenticación a todas las rutas
router.use(validarJWT);

// CRUD de Campañas
router.post('/', createCampaign);                    // Crear campaña
router.get('/', getCampaigns);                       // Obtener campañas con filtros
router.get('/stats', getCampaignStats);              // Estadísticas de campañas
router.get('/:id', getCampaignById);                 // Obtener campaña por ID
router.put('/:id', updateCampaign);                  // Actualizar campaña
router.delete('/:id', deleteCampaign);               // Eliminar campaña

// Envío de campañas
router.post('/:id/send', sendCampaign);              // Enviar campaña

// Gestión de imágenes
router.post('/images/upload', uploadImage);          // Subir imagen
router.get('/images', getImages);                    // Listar imágenes
          // Obtener imagen
router.delete('/images/:filename', deleteImage);     // Eliminar imagen

router.get('/:id/detail', getCampaignDetail);

// Historial resumido de envíos de la campaña
router.get('/:id/history', getCampaignHistory);

module.exports = router;