const {response} = require('express');
const Transactions = require('../model/transactions');
const RequestsGroup = require('../model/requestGroup');
const Requests = require('../model/requests');
const User = require('../model/user');
const Channel = require('../model/channels');

const getTransactionsByTicketId = async(req,res = response)=>{
    const _ticket  = req.body.IdTicket;

    try {
        const _transaction = await Transactions.findAll({
            where:{IdTicket:_ticket},order:[['createdAt','DESC']]
        })
       
        let _totals = [];
     if(_transaction.length>0){
        for (const _t of _transaction) {

            let _values = JSON.parse(_t.values);

            let _reqGroup = null
            if(_values.IdGroup){
                _reqGroup = await RequestsGroup.findOne({
                    where:{
                        IdRequestGroup:_values.IdGroup
                    } 
                })
            }
           
            const _request = await Requests.findOne({
                where:{
                    IdRequest:_values.IdRequest
                }
            })
            const _iduser = await User.findOne({
               where:{
                IdUser:_t.IdUser
               } 
            })

            let _channel = null;
            if(_values.IdChannel){
               _channel = await Channel.findOne({
                where:{
                    IdChannel:_values.IdChannel
                }
               }) 
            }

            const _respuesta = {
                requestGroup:_reqGroup ? _reqGroup.name : '',
                request:_request.name,
                user: _iduser ? `${_iduser.firstName} ${_iduser.lastName}` : '',
                channel: _channel ? _channel.name : '',
                //channel:_values.IdChannel,
                createdAt:_t.createdAt,
                tipo:_t.Tipo
            } 
            

            _totals.push(_respuesta);
        } 
     }
        

        res.status(200).json({
            status: true,
            data:_totals
        })
        

    } catch (error) {
        res.status(500).json({
            status: true,
            msg:'Error: '+error
        })
    }

}

module.exports = {
    getTransactionsByTicketId
}