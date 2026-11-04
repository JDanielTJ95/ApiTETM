const {Router} = require('express');
const {createNewPriority,getAllPrioritys} = require('../controllers/priority')

const {createNewRequests, createNewRequestsGroup, getAllRequestsGroup, getRequestsByGroup, getAllChannels, getAllLocality, getRequestAreas, getLocalityById, getRequestbyAreas, getAllRequests, updateRequestGroup,updateRequest} = require('../controllers/requests')

const {getAllStatus} = require('../controllers/statusController');

const { validarJWT } = require('../middlewares/jwt-check');

const router = Router();

router.post('/priority',validarJWT,createNewPriority);
router.get('/getAllPrioritys',validarJWT,getAllPrioritys);

router.post('/requests',validarJWT,createNewRequests);
router.post('/getRequestsByGroup',validarJWT,getRequestsByGroup);
router.post('/updateRequest',validarJWT,updateRequest);


router.post('/requestsGroups',validarJWT,createNewRequestsGroup);
router.post('/updateRequestGroup',validarJWT,updateRequestGroup);

router.post('/getAllRequestsGroup',validarJWT,getAllRequestsGroup);
router.post('/getAllRequests',validarJWT,getAllRequests);

router.get('/getAllChannels',validarJWT,getAllChannels);

router.post('/getAllLocality',validarJWT,getAllLocality);
router.post('/getLocalityById',validarJWT,getLocalityById);

router.post('/getRequestAreas',validarJWT,getRequestAreas);
router.post('/getRequestbyAreas',validarJWT,getRequestbyAreas);

router.post('/getAllStatus',validarJWT, getAllStatus)

module.exports = router;