const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class Requests extends Model {}
Requests.init({
    IdRequest : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    IdRequestGroup: DataTypes.INTEGER,
    IdPriority: DataTypes.INTEGER,
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
},{
    sequelize,
    modelName: 'requests',
  });
module.exports = Requests;