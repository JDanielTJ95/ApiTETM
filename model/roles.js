const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class Roles extends Model {}
Roles.init({
    IdRole : {
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
    modelName: 'roles',
  })
module.exports = Roles;