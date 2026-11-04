const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class Custom extends Model {}
Custom.init({
    IdCustom: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    Catalog: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'Catálogo de la obra personalizada'
    },
    Comments: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Comentarios adicionales sobre la obra'
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
}, {
    sequelize,
    modelName: 'custom',
    tableName: 'obrascustom',
    timestamps: true
});

module.exports = Custom;