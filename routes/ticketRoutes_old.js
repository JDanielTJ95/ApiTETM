const {Router} = require('express');
const {createNewTicket, getTicketByNumber, getFieldsByForm, updateTicketByNumber, getTicketsByArea, getTicketsByUser, searchAdvanceTickets, exportAdvanceTickets,getTicketsByApplicant,updateDate,deleteTicketsWhereCondition,searchOcp,reassignTicketByNumber,getCustomValues,getDelegaciones} = require('../controllers/ticketController');

const {getCommentsByTicket, uploadAttachment, viewAttachment,viewAttachmentOcp,setCommentAndAttachment } = require('../controllers/commentsControllers');
const { validarJWT } = require('../middlewares/jwt-check');

const multer  = require('multer');
const { getTransactionsByTicketId } = require('../controllers/transactionsController');
const upload = multer({ dest: './tmpfiles/' })

const router = Router();

router.post('/createNewTicket',validarJWT,createNewTicket);
router.post('/getTicketByNumber',validarJWT,getTicketByNumber);
router.post('/getFieldsByForm',validarJWT,getFieldsByForm);
router.post('/updateTicketByNumber',validarJWT,updateTicketByNumber);
router.post('/getTicketsByApplicant',validarJWT,getTicketsByApplicant);


router.post('/getCommentsByTicket',validarJWT,getCommentsByTicket);
router.post('/uploadAttachments',validarJWT,upload.array('attachments'),uploadAttachment);
router.get('/viewAttachment',viewAttachment);
router.get('/viewAttachmentOcp',viewAttachmentOcp);
router.post('/setCommentAndAttachment',setCommentAndAttachment);

router.post('/getTicketsByArea',validarJWT,getTicketsByArea);
router.post('/getTicketsByUser',validarJWT,getTicketsByUser);

router.post('/searchAdvanceTickets',validarJWT,searchAdvanceTickets);
router.post('/searchOcp',validarJWT,searchOcp);

router.post('/exportAdvanceTickets',validarJWT,exportAdvanceTickets);
router.post('/updateDate',validarJWT,updateDate);

router.post('/removeTickets',validarJWT,deleteTicketsWhereCondition);

router.post('/reassignTicketByNumber',validarJWT,reassignTicketByNumber);

router.post('/getTransactionsByTicketId',validarJWT,getTransactionsByTicketId);

router.post('/getCustomValues',validarJWT,getCustomValues);
router.post('/getDelegaciones',validarJWT,getDelegaciones);


module.exports = router;
