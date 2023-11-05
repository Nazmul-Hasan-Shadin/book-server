const express= require('express')
const cors= require('cors')
const jwt= require('jsonwebtoken')
require('dotenv').config()
var cookieParser = require('cookie-parser')

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const secret= 'iloveyou'
const port= process.env.PORT || 5000;
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials:true
}))
app.use(express.json())
app.use(cookieParser())

//  mongodb connecetion



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.wjj4omp.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const database= client.db('book-library').collection('bookcategory');
    const booksDb=client.db('book-library').collection('books');
    const borrowedBooks= client.db('book-library').collection('borrowed-books')

//  verify token

const verifyToken=async(req,res,next)=>{
    const {token}= req.cookies;
    console.log('usertoken is ', token);


    if (!token) {
       return res.status(401).send({message:'unauthorized'})

     }

 jwt.verify(token,secret,(error,decoded)=>{
     if (error) {
       return res.send({message:'error '})
     }
     console.log(decoded ,'decoded gmail');
     req.user=decoded
     
     next()

 })

}




    app.get('/book-category',async(req,res)=>{
         
        const result= await database.find({}).toArray();
        res.send(result)

    })
//    get all books from books collection
    app.get('/books',async(req,res)=>{
         
        const result= await booksDb.find({}).toArray();
        res.send(result)

    })

    // get specific book from booksDb collection
   
    app.get('/findbooksbyid/:id',async(req,res)=>{
         const id= req.params.id;
         const filterId= {_id: new ObjectId(id)}
        const result= await booksDb.find(filterId).toArray()
        res.send(result)

    })

    // find a single book and update its quantity

    app.put('/findbooksbyid/:id',async(req,res)=>{
        const id= req.params.id;
        const filterId= {_id: new ObjectId(id)}
        const updateQuantity= {
            $inc:{
     
             quantity:1
            

            }

            
        }
        const result = await booksDb.updateOne(filterId,updateQuantity)
        console.log(result,'update done');
      
        res.send(result)
          

   })

     
    // find all books based on category 

    app.get('/books/:id',async(req,res)=>{
         const id= req.params.id;
        const result= await booksDb.find({category:id}).toArray()
        res.send(result)
    })
    // signleBook load
    app.get('/single-book/:id',async(req,res)=>{
        const id= req.params.id;
        const filter= {_id: new ObjectId(id)}
       const result= await booksDb.findOne(filter)
       res.send(result)
   })

    //  add book to database 

    app.post('/books',async(req,res)=>{
        const body= req.body;
        const result= await booksDb.insertOne(body)
   console.log(result);     
   res.send(result)
      })


    
    //    post borrowed-books to borrowed-book collection
    
    
    app.post('/borrowed-books',async(req,res)=>{
         
        let body= req.body;
        body.borrowedDate= new Date()
      
        // find existing book
   
    //    const existBorrowedBook= await  borrowedBooks.findOne({
    //      uniqueId: body.uniqueid,
    //      email:body.email
    //    })

      const existBorrowedBook= await  borrowedBooks.findOne({
         unique:"unique"
         
       })



        if (existBorrowedBook) {
       res.send({erro:'you have already  added this book'})
        }
      else{

        const result= await borrowedBooks.insertOne(body)
        console.log(result) 
        res.send(result)
      }
      })

         //    get borrowed-books from borrowed-book collection
      app.get('/borrowed-books',verifyToken,async(req,res)=>{
        const queryEmail= req?.query.email;
         let query= {}
         if (queryEmail) {
            query={email:req.query.email}
           
         }
         const result= await borrowedBooks.find(query).toArray()
         console.log(result);     
         res.send(result)
     
      })


      //  delete a book fromm borrowed-book  collection
      app.delete('/borrowed-books/:id',async(req,res)=>{
        const query= req.params.id;
        const id = {_id: new ObjectId(query)}
         const result= await borrowedBooks.deleteOne(id)
         res.send(result)
         
    
       }) 


    //update book quantity after borrowed
    
    app.put('/books/:id',async(req,res)=>{
     
      
        const user= req.body;

        console.log(user);
     const id= req.params.id
        
        const filter= {_id:new ObjectId(id)}
        const options = { upsert: true };

    
        const quantityToNumber= Number(user.quantity)
        console.log(quantityToNumber);
        const updateUser= {
            $set:{
     
            quantity: quantityToNumber-1,
            

            }
        }
        const result = await booksDb.updateOne(filter,updateUser)
        res.send(result)
          console.log(result,'update done');
       })


    //  update bookcard just
    app.put('/update/:id',async(req,res)=>{
        const id = req.params.id
        const filter= {_id: new ObjectId(id)}
        const user= req.body;
        console.log(user);
         
        const updateUser= {
            $set:{
            bookName: user.bookName,
            quantity: user.quantity,
            rating: user.rating,
            author: user.author,
            category: user.category

            }
             
            
        }
        const result = await booksDb.updateOne(filter,updateUser)
        console.log(result);
        res.send(result)
          
       })

    //    cookie relate api

    app.post('/jwt',async(req,res)=>{
        const user= req.body;
     
     const token= jwt.sign(user,process.env.ACCESS_TOKEN, {expiresIn:'2h'}) ;
     console.log(token)
     
      res.cookie('token',token,{
        httpOnly:true,
        secure:true
      }).send({success:true})

     })  


    


      





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('server is running shadin')
})


app.listen(port, ()=>{
    console.log('book server is running');
})