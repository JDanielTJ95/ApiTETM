const { Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class Token extends Model {}
Token.init({
    IdToken : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    userId: DataTypes.INTEGER,
    token: DataTypes.STRING,
    createdAt: DataTypes.DATE
},{
    sequelize,
    modelName: 'token',
    tableName:'token'
  })

module.exports = Token;