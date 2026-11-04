const express = require('express');
var bodyParser = require('body-parser');
require('dotenv').config();
require('./model/associations')
var cors = require('cors');
const sequelize = require('./db/config');
const app = express();
const createNewUser = require('./model/user');
const { setNewLocation } = require('./controllers/ticketController');
const SurveyResponse = require('./model/surveyresponse');
const Custom = require('./model/custom');
const Delegaciones = require('./model/delegaciones');
const TolDelegaciones = require('./model/toldelegaciones');
const ApplicantMobile = require('./model/applicantMobile');
const CampaignDelivery = require('./model/campaignDelivery');
const Recipient = require('./model/recipient');
//const UserGroup = require('./model/userGroup');
// configurar CORS
app.use(cors());

//LECTRURA Y PARSEO DEL BODY
//app.use(bodyParser.urlencoded({extended : true}));
//app.use(bodyParser.json());
app.use(express.json({ limit: '50mb' }))
// BASE DE DATOS

// directorio publico
app.use(express.static('public') );

// RUTAS
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/config', require('./routes/configRoutes'));
app.use('/api/applicant', require('./routes/applicantRoutes'));
app.use('/api/ticket', require('./routes/ticketRoutes'));
app.use('/api/reports', require('./routes/reportsRoutes'));
app.use('/api/mobile/', require('./routes/mobileRoutes'));
app.use('/api/web/', require('./routes/webRoutes'));

app.use('/api/surveys/', require('./routes/surveyRoutes'));
app.use('/api/campaigns/', require('./routes/campaignRoutes')); // Nuevas rutas de campañas
app.use('/api/recipients/', require('./routes/recipientRoutes')); // Rutas de recipients
app.use('/api/user-groups/', require('./routes/userGroupRoutes')); // Rutas de user groups
app.use('/api/notifications/', require('./routes/pushRoutes'));
/*
app.use('/apinau/login', require('./routes/authRoutes'));
app.use('/apinau/sepomex', require('./routes/sepomexRoutes'));
app.use('/apinau/content', require('./routes/docsRoutes'));
app.use('/apinau/fiscal', require('./routes/fiscalRoutes'));
app.use('/apinau/legal', require('./routes/legalRoutes'));
app.use('/apinau/naucalpan', require('./routes/naucalpanRoutes')); */

/*app.use('/api/hospitales', require('./routes/hospitalR'));
app.use('/api/medicos', require('./routes/medicosR'));

app.use('/api/todo', require('./routes/busquedasR'));
app.use('/api/upload', require('./routes/uploadsR')); */

app.listen(process.env.PORT, ()=>{
    console.log('localhost:', process.env.PORT);
    sequelize.authenticate().then(()=>{
        console.log('MYSQL OK')
       
    }).catch((error)=>{
        console.log('erorr'+error);
    }
        
    )   
});

/* SurveyResponse.sync({ force: false , alter:true});
Custom.sync({ force: false , alter:true});
Delegaciones.sync({ force: false , alter:true});
TolDelegaciones.sync({ force: false , alter:true});
ApplicantMobile.sync({ force: false , alter:true});

UserGroup.sync({ force: false , alter:true});
 */
