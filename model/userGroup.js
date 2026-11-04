const { DataTypes } = require('sequelize');
const sequelize = require('../db/config');

const UserGroup = sequelize.define('UserGroup', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Nombre único del grupo de usuarios'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción del grupo'
    },
    type: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'manual',
        comment: 'Tipo de grupo - solo manual'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Estado activo del grupo'
    },
    // Para grupos manuales - Lista de emails de miembros
    memberEmails: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array de emails de los miembros del grupo manual'
    },
    // Para grupos manuales - Información detallada de miembros
    members: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array con información completa de los miembros (ticketNumber, applicantId, deviceTokens, etc.)'
    },
    // Para grupos manuales - Criterios almacenados (no evaluados automáticamente)
    criteria: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Criterios de filtrado almacenados para referencia (solo informativo)'
    },
    membersCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Número total de miembros en el grupo'
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'ID del usuario que creó el grupo'
    },
    lastSyncAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Última fecha de sincronización (no usado en grupos manuales)'
    }
}, {
    sequelize,
    modelName: 'UserGroup',
    tableName: 'usergroups',
    timestamps: true,
    indexes: [
        {
            fields: ['type']
        },
        {
            fields: ['isActive']
        },
        {
            fields: ['createdBy']
        },
        {
            fields: ['name'],
            unique: true
        }
    ]
});

// Virtual para obtener información completa de miembros
UserGroup.prototype.getMembers = function() {
    return {
        emails: this.memberEmails || [],
        members: this.members || [],
        count: this.membersCount || 0,
        detailedCount: this.members ? this.members.length : 0
    };
};

module.exports = UserGroup;