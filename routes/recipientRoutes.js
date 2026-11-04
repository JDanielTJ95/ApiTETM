const { Router } = require('express');
const { validarJWT } = require('../middlewares/jwt-check');
const {
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
} = require('../controllers/recipientController');

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(validarJWT);

// CRUD de Recipients
router.post('/', createRecipient);                          // Crear recipient
router.get('/', getRecipients);                             // Obtener recipients con filtros
router.get('/stats', getRecipientStats);                    // Estadísticas de recipients
router.get('/:id', getRecipientById);                       // Obtener recipient por ID
router.put('/:id', updateRecipient);                        // Actualizar recipient
router.delete('/:id', deleteRecipient);                     // Eliminar recipient

// Creación desde otras entidades
router.post('/from-applicants', createFromApplicants);      // Crear desde applicants
router.post('/from-tickets', createFromTickets);            // Crear desde tickets

// Gestión de devices
router.post('/:id/devices', addDevice);                     // Agregar device
router.delete('/:id/devices', removeDevice);                // Remover device

module.exports = router;
