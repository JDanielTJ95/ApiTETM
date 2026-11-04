const { Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class User extends Model {}
User.init({
    IdUser : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    IdRole: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    active: DataTypes.BOOLEAN,
    mc:DataTypes.BOOLEAN,
    ocp:DataTypes.BOOLEAN,
    IdArea: DataTypes.INTEGER
},{
    sequelize,
    modelName: 'user',
  })

  console.log(User === sequelize.models.User);
module.exports = User;