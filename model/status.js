const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class Status extends Model {}
Status.init({
    IdStatus : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
},{
    sequelize,
    modelName: 'status',
    tableName:'status'
  })
module.exports = Status;