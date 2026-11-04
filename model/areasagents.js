const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class AreasAgentes extends Model {}
AreasAgentes.init({
    IdAreaAgent : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    IdUser: DataTypes.INTEGER,
    IdArea: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
},{
    sequelize,
    modelName: 'areasagents', 
  })
module.exports = AreasAgentes;