import bodyParser from "body-parser";
import express from "express";
import axios from "axios";
import pg from "pg";

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));

const db = new pg.Client(
    {
    user:"postgres",
    host:"localhost",
    database:"reviews",
    password:"Ninja@890",
    port:5432
    }
)

db.connect();

var query;
var post_flag = 0

app.get("/", async (req,res)=>
{
    if(!post_flag)
        query = "select * from book_data order by id";
    
    let booklist = await db.query(query);
    booklist = booklist.rows;
    
    for (const book of booklist) 
    {
    book.read_date = book.read_date.toString().split("00")[0];

    // Fetch the image
    const result = await axios.get(`https://covers.openlibrary.org/b/isbn/${book.cover_key}-M.jpg`, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(result.data, 'binary');
    
    // Convert image to base64 and assign to the book object
    book.image = imageBuffer.toString('base64');
    }    
    post_flag=0;
    res.render("index.ejs",{booklist : booklist});
})

app.post("/", (req,res) => {
    
    if(req.body.title)
        query = "select * from book_data order by book_title";
    else if (req.body.recency)
        query = "select * from book_data order by read_date";
    else if(req.body.rating)
        query = "select * from book_data order by book_rating DESC";
    post_flag = 1;
    
    res.redirect("/");
})

app.get("/new",(err,res)=>
{
    res.render("new.ejs",{ heading:"CREATE REVIEWS"});
});

app.post("/create", async (req,res)=>
{
    if(req.body.id)
    {
        const result = await db.query('update book_data set cover_key = $1, book_title = $2, read_date = $3, book_rating = $4, book_content = $5 where id = $6', 
        [req.body.cover_id,req.body.book_title,req.body.read_date,req.body.book_rating,req.body.book_content, req.body.id]);
        res.redirect("/");
    }

    else
    {
        const result = await db.query('insert into book_data(cover_key, book_title, read_date, book_rating, book_content) values ($1,$2,$3,$4,$5)', 
        [req.body.cover_id,req.body.book_title,req.body.read_date,req.body.book_rating,req.body.book_content]);
        res.redirect("/");
    }
    
});

app.post("/edit",async (req,res)=>
{
        let post = await db.query("select * from book_data where id = $1", [req.body.updatedItemId]);
        post = post.rows[0];
        post.read_date = post.read_date.toString().split("00")[0];
        res.render("new.ejs",{post : post, heading: "Edit Review"})

});

app.post("/delete", async(req,res) => 
{
    let post = await db.query("delete from book_data where id = $1", [req.body.deleteItemId]);
    res.redirect("/");

})

app.listen(port,() => 
{
    console.log("Server running on ",port);
})
