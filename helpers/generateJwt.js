const { decode } = require('jsonwebtoken');
const jwt = require('jsonwebtoken');

const generarJWT = (user_id) => {
    
    return new Promise( (resolve, reject) => {
        const payload = {user_id}

        jwt.sign(
            payload, 
            process.env.JWT_SECRET, 
            {expiresIn: '19h'},
            (err, token) =>{
                if(err){
                    console.log(err);
                    reject('Error, no se generó el token');
                }else{
                    var decoded = jwt.decode(token);
                    //console.log(decoded)
                    resolve({token:token,exp:decoded.exp});
                }

            }
        )
    });
}

module.exports = {
    generarJWT
}