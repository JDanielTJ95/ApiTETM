const {Router} = require('express');
const {ticketsByDate, ticketsByDateAndAllStatus, totalTicketsByStatus, totalAreasByUsers, totalAreasByUsersStatus,ticketsByChannel} = require('../controllers/reportsController');
const { validarJWT } = require('../middlewares/jwt-check');
const router = Router();

router.post('/ticketsByDate',validarJWT,ticketsByDate);
router.post('/ticketsByDateAndAllStatus',validarJWT,ticketsByDateAndAllStatus);
router.post('/totalTicketsByStatus',validarJWT,totalTicketsByStatus);
router.post('/totalAreasByUsers',validarJWT,totalAreasByUsers);
router.post('/totalAreasByUsersStatus',validarJWT,totalAreasByUsersStatus);
router.post('/ticketsByChannel',validarJWT,ticketsByChannel)
module.exports = router;