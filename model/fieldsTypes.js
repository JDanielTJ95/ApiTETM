const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class FieldsTypes extends Model {}
FieldsTypes.init({
    IdType : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    value: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
},{
    sequelize,
    modelName: 'fieldsTypes', 
  })
module.exports = FieldsTypes;