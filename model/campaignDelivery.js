const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class CampaignDelivery extends Model {}
CampaignDelivery.init({
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    campaignId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'campaigns',
            key: 'id'
        }
    },
    recipientType: {
        type: DataTypes.ENUM('all', 'groups', 'custom', 'survey-tickets'),
        allowNull: false
    },
    recipientGroups: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array de IDs de grupos destinatarios'
    },
    customRecipients: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array de destinatarios específicos'
    },
    deliverySettings: {
        type: DataTypes.JSON,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
        allowNull: false
    },
    scheduledFor: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha programada para envío'
    },
    sentAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha y hora de envío real'
    },
    totalRecipients: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Número total de destinatarios'
    },
    successCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Número de envíos exitosos'
    },
    failureCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Número de envíos fallidos'
    },
    deliveryResults: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Resultados detallados del envío'
    },
    createdBy: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'ID del usuario que creó el envío'
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
}, {
    sequelize,
    modelName: 'campaignDelivery',
    tableName: 'campaign_deliveries',
    timestamps: true
});

module.exports = CampaignDelivery;
