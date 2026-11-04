const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class RequestsGroup extends Model {}
RequestsGroup.init({
    IdRequestGroup : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
},{
    sequelize,
    modelName: 'requestGroups',
  })
module.exports = RequestsGroup;