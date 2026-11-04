const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class Fields extends Model {}
Fields.init({
    IdField : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    IdForm: DataTypes.INTEGER,
    slug: DataTypes.STRING,
    name: DataTypes.STRING,
    IdType: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
},{
    sequelize,
    modelName: 'fields', 
  })
module.exports = Fields;