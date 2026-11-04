const Requests = require('../model/requests');
const RequestGroups = require('../model/requestGroup');
const Priorities = require('../model/priority');
const Users = require('../model/user');
const Roles = require('../model/roles');
const AreasAgents = require('../model/areasagents');
const Areas = require('../model/areas');
const Tickets = require('../model/tickets')
const TicketsValues = require('../model/ticketValues');
const {Model, DataTypes,sequelize} = require('sequelize');
const Applicants = require('./applicants');
const Channel = require('./channels');
const Priority = require('../model/priority');
const Fields = require('../model/fields');
const FieldsTypes = require('./fieldsTypes');
const Status = require('../model/status');
const Comments = require('./comments');
const User = require('../model/user');
const Attachments = require('./attachments');
const RequestAreas = require('./requestareas');
const AreasAgentes = require('../model/areasagents');
const Mexico = require('./mexico');
const mcidentifier = require('./mcid');

const Survey = require('./surveys');
const SurveyQuestion = require('./surveyquestion');
const SurveyResponse = require('./surveyresponse');
const ApplicantMobile = require('./applicantMobile');
const Campaign = require('./pushnotification'); // Renombrado a Campaign
const CampaignDelivery = require('./campaignDelivery');
const UserGroup = require('./userGroup');
const Recipient = require('./recipient');
///Servicios
Requests.belongsTo(RequestGroups,{foreignKey:{name:'IdRequestGroup'}});
Requests.belongsTo(Priorities,{foreignKey:{name:'IdPriority'}});
Users.belongsTo(Roles,{foreignKey:{name:'IdRole'}});
AreasAgents.belongsTo(Areas,{foreignKey:{name:'IdArea'}});
//Areas.belongsTo(Users,{foreignKey:'IdUser'});
Areas.belongsToMany(Users,{through:'areasagents',foreignKey:'IdArea'});
Users.belongsToMany(Areas,{through:'areasagents',foreignKey:'IdUser'});
RequestGroups.belongsToMany(Areas,{through:'requestsAreas',foreignKey:'IdRequestGroup'});
Areas.belongsToMany(RequestGroups,{through:'requestsAreas',foreignKey:'IdArea'});
RequestAreas.belongsTo(RequestGroups,{foreignKey:'IdRequestGroup'})
RequestAreas.hasMany(Requests,{foreignKey:'IdRequestGroup'});
RequestGroups.hasMany(Requests,{foreignKey:'IdRequestGroup'});
RequestGroups.hasMany(RequestAreas,{foreignKey:'IdRequestGroup'});
RequestAreas.belongsTo(Areas,{foreignKey:'IdArea'});
Users.hasMany(AreasAgentes,{foreignKey:'IdUser'});
///Ticket
Tickets.hasMany(TicketsValues,{foreignKey:'IdTicket'});
Tickets.belongsTo(Requests,{foreignKey:'IdRequest'});
Tickets.belongsTo(RequestGroups,{foreignKey:'IdGroup'});
Tickets.belongsTo(Applicants,{foreignKey:'IdApplicant'});
Tickets.belongsTo(Areas,{foreignKey:'IdArea'});
Tickets.belongsTo(Channel,{foreignKey:'IdChannel'});
Tickets.belongsTo(Priority,{foreignKey:'IdPriority'});
Tickets.belongsTo(Status,{foreignKey:'IdStatus'});
Tickets.belongsTo(User,{foreignKey:'IdUser'});
Tickets.hasOne(mcidentifier,{foreignKey:'IdTicket',sourceKey: "IdTicket"})
TicketsValues.belongsTo(Fields,{foreignKey:'IdField'});
Fields.belongsTo(FieldsTypes,{foreignKey:'IdType'});
Tickets.hasOne(Mexico,{foreignKey:'id_asenta_cpcons',sourceKey:'id_asenta_cpcons'})
Comments.hasOne(User,{foreignKey:'IdUser',sourceKey: "IdAuthor"})
Comments.hasOne(Applicants,{foreignKey:'IdApplicant',sourceKey: "IdAuthor"})
Comments.hasMany(Attachments,{foreignKey:'IdComment'});


Survey.hasMany(SurveyQuestion, { 
    foreignKey: 'IdSurvey',
    as: 'questions'
});

SurveyQuestion.belongsTo(Survey, { 
    foreignKey: 'IdSurvey',
    as: 'survey'
});

// Relaciones Survey -> SurveyResponse (Many-to-Many through SurveyResponse)
Survey.hasMany(SurveyResponse, { 
    foreignKey: 'IdSurvey',
    as: 'responses'
});

SurveyResponse.belongsTo(Survey, { 
    foreignKey: 'IdSurvey',
    as: 'survey'
});

// Relaciones Ticket -> SurveyResponse
Tickets.hasMany(SurveyResponse, { 
    foreignKey: 'IdTicket',
    as: 'surveyResponses'
});

SurveyResponse.belongsTo(Tickets, { 
    foreignKey: 'IdTicket',
    as: 'ticket'
});

Applicants.hasOne(ApplicantMobile, { 
    foreignKey: 'IdApplicant',sourceKey: "IdApplicant"
});

// Asociaciones para Recipients
Recipient.belongsTo(Applicants, { 
    foreignKey: 'applicantId',
    targetKey: 'IdApplicant',
    as: 'applicant',
    constraints: false // Permite que applicantId sea null para otros tipos
});

Applicants.hasMany(Recipient, { 
    foreignKey: 'applicantId',
    sourceKey: 'IdApplicant',
    as: 'recipients',
    constraints: false
});

Recipient.belongsTo(Tickets, { 
    foreignKey: 'ticketId',
    targetKey: 'IdTicket',
    as: 'ticket',
    constraints: false
});

Tickets.hasMany(Recipient, { 
    foreignKey: 'ticketId',
    sourceKey: 'IdTicket',
    as: 'recipients',
    constraints: false
});

Recipient.belongsTo(User, { 
    foreignKey: 'userId',
    targetKey: 'IdUser',
    as: 'user',
    constraints: false
});

User.hasMany(Recipient, { 
    foreignKey: 'userId',
    sourceKey: 'IdUser',
    as: 'recipients',
    constraints: false
});


// Asociaciones para Campañas
Campaign.hasMany(CampaignDelivery, { 
    foreignKey: 'campaignId',
    as: 'deliveries'
});

CampaignDelivery.belongsTo(Campaign, { 
    foreignKey: 'campaignId',
    as: 'campaign'
});

// En el archivo de asociaciones o en cada modelo
