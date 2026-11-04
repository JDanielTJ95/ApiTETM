const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class Tickets extends Model {}
Tickets.init({
    IdTicket : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    IdPriority:DataTypes.INTEGER,
    IdChannel:DataTypes.INTEGER,
    IdStatus:DataTypes.INTEGER,
    IdRequest:DataTypes.INTEGER,
    IdForm:DataTypes.INTEGER,
    IdUser:DataTypes.INTEGER,
    IdGroup:DataTypes.INTEGER,
    IdApplicant:DataTypes.INTEGER,
    IdArea:DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
id_asenta_cpcons: DataTypes.INTEGER
},{
    sequelize,
    modelName: 'tickets',
  })
module.exports = Tickets;
