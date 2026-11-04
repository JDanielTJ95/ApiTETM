const { Router } = require('express');
const { validarJWT } = require('../middlewares/jwt-check');
const { 
    createSurvey,
    getAllSurveys,
    getSurveyById,
    assignSurveyToTicket,
    updateSurvey,
    deleteSurvey,
    sendSurveyToTickets,
    completeSurvey,
    resendSurvey,
    getSurveyHistory,
    getSurveyResponsesByTicket,
    getSurveyResponsesByMultipleTickets,
    getSurveyResponseByTicketId,
    addSentRecordEndpoint,
    addSentRecordMultiple,
    deleteSurveyPermanently,
    getSurveysByRequestGroup
} = require('../controllers/surveyController');


const router = Router();

// Aplicar validarJWT a todas las rutas
router.use(validarJWT);

// CRUD de Surveys
router.post('/create',validarJWT, createSurvey);                          
router.get('/all', validarJWT, getAllSurveys);                             
router.get('/:surveyId', validarJWT, getSurveyById);                       
router.put('/:surveyId', validarJWT, updateSurvey);                        
router.delete('/:surveyId', validarJWT, deleteSurvey);                     

// Asignación de encuestas a tickets
router.post('/assign', validarJWT, assignSurveyToTicket);                  
router.post('/send-multiple', validarJWT, sendSurveyToTickets);            

// Gestión de registros de envío
router.post('/add-sent-record', validarJWT, addSentRecordEndpoint);        
router.post('/add-sent-record-multiple', validarJWT, addSentRecordMultiple); 

// Gestión de respuestas
router.put('/complete/:surveyResponseId', validarJWT, completeSurvey);
router.put('/resend/:surveyResponseId', validarJWT, resendSurvey);
router.get('/history/:surveyResponseId', validarJWT, getSurveyHistory);

// Consultas de respuestas
router.get('/response/ticket/:ticketId', validarJWT, getSurveyResponseByTicketId);       // Una survey response por ticket
router.get('/responses/ticket/:ticketId', validarJWT, getSurveyResponsesByTicket);       // Todas las survey responses
router.post('/responses/tickets', validarJWT, getSurveyResponsesByMultipleTickets);      

router.delete('/:surveyId/permanent', deleteSurveyPermanently);

router.get('/request-group/:requestGroupId', getSurveysByRequestGroup);


module.exports = router;