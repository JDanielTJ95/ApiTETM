const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class SurveyResponse extends Model {}
SurveyResponse.init({
    IdSurveyResponse: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    IdSurvey: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'surveys',
            key: 'IdSurvey'
        }
    },
    IdTicket: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tickets',
            key: 'IdTicket'
        }
    },
    IdUser: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Usuario que respondió la encuesta'
    },
    status: {
        type: DataTypes.ENUM('sent', 'in_progress', 'completed', 'expired'),
        allowNull: false,
        defaultValue: 'sent'
    },
     sentAt: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: 'Array de fechas de envío de la encuesta [{date: "2025-07-10T15:30:00Z", attempt: 1}]'
    },
    completedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    responseData: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Respuestas completas de la encuesta en formato JSON'
    },
    totalSentCount:{
         type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Total de envíos realizados para esta encuesta'
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
}, {
    sequelize,
    modelName: 'surveyResponse',
    tableName: 'survey_responses',
    timestamps: true
});

module.exports = SurveyResponse;