const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class Transactions extends Model {}
Transactions.init({
    IdTransaction : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    IdUser: DataTypes.INTEGER,
    Tipo: DataTypes.STRING,
    IdUser: DataTypes.INTEGER,
    values:DataTypes.STRING,
        IdTicket: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
},{
    sequelize,
    modelName: 'transactions', 
})
module.exports = Transactions;