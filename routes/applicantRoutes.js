const {Router} = require('express');
const {createNewApplicant,getApplicantByQuery, updateApplicant,deleteApplicant} = require('../controllers/applicantController')
const { validarJWT } = require('../middlewares/jwt-check');

const router = Router();

router.post('/',validarJWT,createNewApplicant);
router.post('/getApplicantByQuery',validarJWT,getApplicantByQuery);
router.post('/updateApplicant',validarJWT,updateApplicant);
router.post('/deleteApplicant',validarJWT,deleteApplicant);

module.exports = router;