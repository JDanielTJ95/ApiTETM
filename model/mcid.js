const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class mcidentifier extends Model {}
mcidentifier.init({
    Idmcidentifier : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    IdTicket: DataTypes.INTEGER,
    IdArea: DataTypes.INTEGER,
    IdMc: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
},{
    sequelize,
    modelName: 'mcidentifier',
    tableName:'mcidentifier'
  })
module.exports = mcidentifier;