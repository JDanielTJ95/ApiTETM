const {Router} = require('express');
const {login,reLogin,recoverPassword,resetPassword}= require('../controllers/authController');
const { validarJWT } = require('../middlewares/jwt-check');

const router = Router();

router.post('/',login);
router.post('/recovery',recoverPassword);
router.post('/resetPassword',resetPassword);
router.post('/relogin',validarJWT,reLogin);

module.exports = router;