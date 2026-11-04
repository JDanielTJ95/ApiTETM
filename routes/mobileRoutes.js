const {Router} = require('express');
const {createNewTicket, uploadAttachment, loginApplicant,
getTicketsByApplicant,
getDetailTicketByTicket,
getTicketsByStatus,updateApplicantByIdApplicant} = require('../controllers/../controllers/mobileController');
const { validarApi } = require('../middlewares/jwt-check');
const multer  = require('multer')
const upload = multer({ dest: './tmpfiles/' })

const router = Router();

router.post('/createTicket',validarApi,createNewTicket);
router.post('/loginApplicant',validarApi,loginApplicant);
router.post('/uploadAttachment',validarApi,upload.array('attachments'),uploadAttachment);

router.post('/getTicketsByApplicant',validarApi,getTicketsByApplicant);
router.post('/getDetailTicketByTicket',validarApi,getDetailTicketByTicket);
router.post('/getTicketsByStatus',validarApi,getTicketsByStatus);
router.post('/updateApplicantByIdApplicant',validarApi,updateApplicantByIdApplicant);

module.exports = router;
