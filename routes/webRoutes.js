const {Router} = require('express');
const {getAllLocality, getAllRequests, loginApplicant, createNewTicket, uploadAttachment,checkVerification,startVerify} = require('../controllers/webController');
const { validarApi } = require('../middlewares/jwt-check');
const multer  = require('multer')
const upload = multer({ dest: './tmpfiles/'})

const router = Router();

router.post('/createTicket',validarApi,createNewTicket);
router.post('/loginApplicant',validarApi,loginApplicant);
router.post('/uploadAttachment',validarApi,upload.array('attachments'),uploadAttachment);
router.post('/getAllLocality',validarApi,getAllLocality);
router.get('/getAllRequests',validarApi,getAllRequests);
router.post('/checkVerify',validarApi,checkVerification);
router.post('/setVerify',validarApi,startVerify);

module.exports = router;