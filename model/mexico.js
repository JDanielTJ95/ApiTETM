const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class Mexico extends Model {}
Mexico.init({
    d_codigo : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    d_asenta: DataTypes.STRING,
    d_tipo_asenta: DataTypes.STRING,
    D_mnpio: DataTypes.STRING,
    d_estado: DataTypes.STRING,

    d_ciudad: DataTypes.STRING,
    d_CP: DataTypes.INTEGER,
    c_estado: DataTypes.INTEGER,

    c_oficina: DataTypes.INTEGER,
    c_CP: DataTypes.STRING,
    c_tipo_asenta: DataTypes.INTEGER,

    c_mnpio: DataTypes.INTEGER,
    id_asenta_cpcons: DataTypes.INTEGER,
    d_zona: DataTypes.STRING,
    c_cve_ciudad: DataTypes.INTEGER,
    IdField: DataTypes.INTEGER,
},{
    sequelize,
    modelName: 'mexico', 
  })
module.exports = Mexico;