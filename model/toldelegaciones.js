const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class TolDelegaciones extends Model {}
TolDelegaciones.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true
    },
    name: DataTypes.STRING
},{
    sequelize,
    modelName: 'TolDelegaciones', 
    tableName: 'toldelegaciones', // Specify the table name explicitly
    timestamps: false // Disable automatic timestamps if not needed
})

module.exports = TolDelegaciones;