const { DataTypes } = require('sequelize');
const sequelize = require('../db/config');

const Recipient = sequelize.define('Recipient', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            isEmail: true
        }
    },
    firstName: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    lastName: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    fullName: {
        type: DataTypes.VIRTUAL,
        get() {
            const firstName = this.getDataValue('firstName') || '';
            const lastName = this.getDataValue('lastName') || '';
            return `${firstName} ${lastName}`.trim();
        }
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    type: {
        type: DataTypes.ENUM('individual', 'ticket-applicant', 'ticket-user', 'group-member'),
        allowNull: false,
        defaultValue: 'individual'
    },
    source: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Origen del recipient: survey-ticket, manual, import, group, etc.'
    },
    // Para push notifications
    devices: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array de device tokens para push notifications'
    },
    // Metadatos específicos del origen
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Metadatos específicos: ticketId, surveyId, ticketStatus, groupId, etc.'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    lastEngagement: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Última fecha de interacción/engagement'
    },
    // Foreign keys para asociaciones
    applicantId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID del applicant asociado (si aplica)'
    },
    ticketId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID del ticket asociado (si aplica)'
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID del usuario asociado (si aplica)'
    }
}, {
    tableName: 'recipients',
    timestamps: true,
    paranoid: false,
    indexes: [
        {
            fields: ['email']
        },
        {
            fields: ['type']
        },
        {
            fields: ['source']
        },
        {
            fields: ['isActive']
        },
        {
            fields: ['lastEngagement']
        },
        {
            fields: ['applicantId']
        },
        {
            fields: ['ticketId']
        },
        {
            fields: ['userId']
        }
    ]
});

module.exports = Recipient;
