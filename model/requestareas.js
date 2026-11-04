const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class RequestAreas extends Model {}
RequestAreas.init({
    IdRequestArea : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    IdRequestGroup: DataTypes.INTEGER,
    IdArea: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
},{
    sequelize,
    modelName: 'requestsAreas',
    tableName:"requestsAreas"
  })
module.exports = RequestAreas;