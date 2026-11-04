const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class Survey extends Model {}
Survey.init({
    IdSurvey: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    surveyType: {
        type: DataTypes.ENUM('satisfaction', 'quality', 'feedback', 'nps'),
        allowNull: false,
        defaultValue: 'satisfaction'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    isTemplate: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Indica si es una plantilla reutilizable'
    },
    assignedToAllGroups: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Si true, la survey está disponible para todos los requestGroups'
    },
    assignedRequestGroups: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array de objetos con requestGroupId, assignedAt, assignedBy'
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
}, {
    sequelize,
    modelName: 'survey',
    tableName: 'surveys',
    timestamps: true
});

module.exports = Survey;