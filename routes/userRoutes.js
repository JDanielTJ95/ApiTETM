const {Router} = require('express');
const {createNewUser, getAllUsers, getAllRoles, getAllAreas, getUsersByAreas, getAreasByUsers, setAreasByUser,updateUser, createNewArea, updateArea, updatePassword}= require('../controllers/userController');
const { validarJWT } = require('../middlewares/jwt-check');

const router = Router();

/* router.get('/',validarJWT ,getUsuarios);
router.get('/user',validarJWT ,getUsuario);
router.post('/', crearUsuario);
router.post('/status',validarJWT,setStatus);
router.get('/status',validarJWT,getStatus);

router.put('/:id', validados,actualizarUser );
router.delete('/:id',validarJWT,borrarUser );

router.post('/getCurp',getCurp ); */

router.post('/',createNewUser)
router.post('/getUsers',validarJWT,getAllUsers);
router.get('/getRoles',validarJWT,getAllRoles);

router.post('/getAllAreas',validarJWT,getAllAreas);
router.post('/createNewArea',validarJWT,createNewArea);
router.post('/updateArea',validarJWT,updateArea);

router.post('/updateUser',validarJWT,updateUser);
router.post('/updatePassword',validarJWT,updatePassword);


router.post('/getUsersByAreas',validarJWT,getUsersByAreas);
router.post('/getAreasByUsers',validarJWT,getAreasByUsers);

router.post('/setAreasByUser',validarJWT,setAreasByUser);


module.exports = router;
