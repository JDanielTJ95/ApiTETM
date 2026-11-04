const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class Delegaciones extends Model {}
Delegaciones.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true
    },
    colonia: DataTypes.STRING,
    delegacion: DataTypes.STRING
},{
    sequelize,
    modelName: 'Delegaciones', 
    tableName: 'delegaciones', // Specify the table name explicitly
    timestamps: false // Disable automatic timestamps if not needed
})

module.exports = Delegaciones;