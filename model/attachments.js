const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class Attachments extends Model {}
Attachments.init({
    IdAttachment : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    contentType: DataTypes.STRING,
    fileName: DataTypes.STRING,
    url: DataTypes.STRING,
    size: DataTypes.INTEGER,
    IdComment: DataTypes.INTEGER,
    createdAt: DataTypes.DATE
},{
    sequelize,
    modelName: 'attachments', 
  })
module.exports = Attachments;