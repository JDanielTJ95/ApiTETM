const nodemailer = require('nodemailer');
const sendEMail = async(type,ticket,comment,to,email,pass)=>{
    to==null ? to = 'fernando.guzmanv@gmail.com' : null;
    
    try {
       
const transporter = nodemailer.createTransport({
  host: "smtp1.toluca.gob.mx",
  port: 2525,
  secure: false,
  auth: {
    user: "smtp_apptoluca",
    pass: "6Xg9yA%sTLo4",
  },
 tls: {
    rejectUnauthorized: false //
  },
connectionTimeout:60000,
greetingTimeout:60000

});
         let msg = await typeMessage(type,ticket,comment,email,pass);
        
         var mailOptions = {
             from: 'Toluca en tus manos" <atendido@toluca.gob.mx>',
             to: to, // list of receivers (who receives)
             subject: `${msg.subject}`, // Subject line
             text: msg.text, // plaintext body
             html: msg.html // html body
         };
        
        //  console.log(mailOptions);
        transporter.sendMail(mailOptions).then((data)=>{
		console.log(mailOptions);
            console.log("Message sentok: %s", data);
        }).catch(err=>{
		"Error Message sent"
            console.log(err);
        })
               //console.log("Message sent: %s", se.messageId);
          //guardar status en base***
        return se.messageId
    } catch (error) {
        return error;
    }
     
}


const typeMessage= async(type,ticket,comment,email,password)=>{
    switch (type) {
        case 1:
            let msg = {}
            msg.subject = `Toluca en tus manos solictud Recibida #${ticket}`;
            msg.text = `Hemos recibido su solicitud (${ticket})  y nuestro personal de la Dirección Muncipal correspondiente la está revisando.`;
            msg.html = `<p>Hemos recibido su solicitud <b>(${ticket})</b>  y nuestro personal de la Dirección Muncipal correspondiente la está revisando.</p>
            <p><b>Gracias por ayudarnos a mejorar nuestro municipio. <br>Naucalpan de Juárez</b></p>`

            msg.html = `
            <img src="${process.env.URL_PROD}/assets/images/logo_tol_b.png" alt="Paris" style="width:30%; display: block;
            margin-left: auto;
            margin-right: auto;">
            <h2 style="text-align:center">Toluca en tus manos</h2>
            <p style="text-align:center">Hemos recibido su solicitud <b>(${ticket})</b>  y nuestro personal de la Dirección Municipal correspondiente la está revisando.</p>
            <p style="text-align:center"><b>Gracias por ayudarnos a mejorar nuestro municipio.  <br><b style="text-align:center">Toluca en tus manos</b> </p>`
            return msg;
        case 2:
            let msg2 = {}
            msg2.subject = `Toluca en tus manos - Ticket # ${ticket} se ha actualizado`;
            msg2.text = `Su solicitud (${ticket}) se ha actualizado, nuestro personal  le ha enviado un mensaje: ${comment}
            `;
            msg2.html = `
            <h2>Su solicitud (${ticket}) se ha actualizado, nuestro personal le ha enviado un mensaje:
            </h2>
            <table style="border:solid 1px gray; width:80%;background-color:#fff;margin-left:auto;margin-right:auto">
            <tr style="padding:8px">
              <td style="padding:8px">
              <img src="${process.env.URL_PROD}/assets/images/logo_tol_b.png" style="display:block;margin-left:auto;margin-right:auto;width:50px">
              </td>
              <td style="padding:8px"><b>Toluca en tus manos</b>
                  <br>
                  <span>
                 ${comment.date}
                  </span>
                  
              </td>
            
            </tr>
            <tr style="padding:8px">
              <td style="padding:8px"></td>
              <td style="padding:8px">
              ${comment.comment}
              </td>
            </tr>
          
          </table>
           `;console.log(2)
            return msg2;
            case 3:
                let msg3 = {}
                msg3.subject = `Reestablecer contraseña`;
                msg3.text = `Ingresa al siguiente enlace para poder iniciar con la recuperación de tu contraseña: ${process.env.URL_PROD}/account/change-password${comment}`;
                msg3.html = `<p>Ingresa al siguiente enlace para poder iniciar con la recuperación de tu contraseña:</p>
                <p>
                    <a href="${process.env.URL_PROD}/account/change-password${comment}">Recuperar contraseña</a>
                <br><b>Toluca en tus manos</b></p>`
                return msg3;  
                case 4:
                    let msg4 = {}
                    msg4.subject = `Bienvenido`;
                    msg4.text = `Bienvenido. A continuación te enviamos tus credenciales de acceso:
                    EMAIL: ${email}
                    Contraseña: ${password}

                    Debes ingresar al siguiente enlace:

                    ${process.env.URL_PROD}/account/login
                    `;
                    msg4.html = `
                    <img src="${process.env.URL_PROD}/assets/images/logo_tol_b.png" alt="Paris" style="width:30%; display: block;
                    margin-left: auto;
                    margin-right: auto;">
                    <h2 style="text-align:center">Toluca en tus manos</h2>
                    <p style="text-align:center">A continuación te enviamos tus credenciales de acceso:</p>
                    <p>
                    <p style="width:50%; display: block;
                    margin-left: auto;
                    margin-right: auto;margin-top:50px">
                        <span>Email: ${email}</span>
                        <br>
                        <br>
                        <span>Contraseña: ${password}</span>
                    </p>
                    <div style="text-align:center;margin-top:25px">
                    <a style="background-color:#62489d;padding:15px;border-radius:5px;color:white" href="${process.env.URL_PROD}/account/login">Ingresar</a>
                    </div>
                    <br><b style="text-align:center">Toluca en tus manos</b></p>`
                    return msg4;  
        default:
            break;
    }
}


module.exports = {
    sendEMail
}
