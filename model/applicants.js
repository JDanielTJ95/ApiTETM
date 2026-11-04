const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class Applicants extends Model {}
Applicants.init({
    IdApplicant : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    lastName2: DataTypes.STRING,
    fullName: DataTypes.STRING,
    email: DataTypes.STRING,
    phone: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
	curp:DataTypes.STRING,
	device:DataTypes.JSON,
	latitude:DataTypes.TEXT,
	longitude:DataTypes.TEXT
},{
    sequelize,
    modelName: 'applicants', 
  })
module.exports = Applicants;
