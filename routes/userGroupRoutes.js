const { Router } = require('express');
const { validarJWT } = require('../middlewares/jwt-check');
const {
    createUserGroup,
    getUserGroups,
    getUserGroupById,
    updateUserGroup,
    deleteUserGroup,
    addMembersToGroup,
    removeMembersFromGroup,
    getGroupsStatistics
} = require('../controllers/userGroupController');

const router = Router();

// Aplicar autenticación a todas las rutas (comentado para desarrollo)
router.use(validarJWT);

// Rutas de estadísticas (debe ir antes de las rutas con parámetros)
router.get('/stats', getGroupsStatistics);                  // Estadísticas de grupos

// CRUD de User Groups
router.post('/', createUserGroup);                          // Crear grupo manual
router.get('/', getUserGroups);                             // Obtener grupos con filtros
router.get('/:id', getUserGroupById);                       // Obtener grupo por ID
router.put('/:id', updateUserGroup);                        // Actualizar grupo
router.delete('/:id', deleteUserGroup);                     // Eliminar grupo

// Gestión de Members/Miembros para grupos manuales
router.post('/:id/members', addMembersToGroup);             // Agregar miembros al grupo
router.delete('/:id/members', removeMembersFromGroup);      // Remover miembros del grupo

module.exports = router;