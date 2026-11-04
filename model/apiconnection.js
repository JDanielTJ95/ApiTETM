const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class Apiconnection extends Model {}
Apiconnection.init({
    IdApi : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: DataTypes.STRING,
    key:DataTypes.STRING,
    status: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
},{
    sequelize,
    modelName: 'apiconnections', 
  })
module.exports = Apiconnection;
