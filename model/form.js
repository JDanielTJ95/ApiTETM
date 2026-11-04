const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class Forms extends Model {}
Forms.init({
    IdForm : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    description: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
},{
    sequelize,
    modelName: 'forms', 
  })
module.exports = Forms;