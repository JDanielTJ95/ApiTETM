const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class Campaign extends Model {}
Campaign.init({
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    notificationName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nombre interno de la campaña'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Título que ve el usuario'
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Mensaje de la notificación'
    },
    image: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL de la imagen (opcional)'
    },
    status: {
        type: DataTypes.ENUM('draft', 'active', 'sent', 'scheduled', 'archived'),
        allowNull: false,
        defaultValue: 'draft'
    },
    gradient: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Gradiente para UI (opcional)'
    },
    createdBy: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'ID del usuario que creó la campaña'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Metadatos adicionales (sourceType, sourceId, tags)'
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
}, {
    sequelize,
    modelName: 'campaign',
    tableName: 'campaigns',
    timestamps: true
});

module.exports = Campaign;