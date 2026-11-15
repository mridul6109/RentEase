
#include<iostream>
#include<string>
#include<fstream>
#include<iomanip>
#include<vector>
#include<limits>
using namespace std;

class Room{
public:
int id;
string location,owner;
double rent;
int available;
Room(){
id=0;
location="";
owner="";
rent=0;
available=1;
}
};

struct Node{
Room data;
Node*next;
};

struct TreeNode{
int id;
Node*room;
TreeNode*left;
TreeNode*right;
};

class ManageRooms{
private:
Node*head;
TreeNode*root;

Node*findById(int id){
TreeNode*temp=root;
while(temp!=NULL){
if(temp->id==id)return temp->room;
if(id<temp->id)temp=temp->left;
else temp=temp->right;
}
return NULL;
}

TreeNode*insertTree(TreeNode*tree,Node*room){
if(tree==NULL){
TreeNode*newNode=new TreeNode;
newNode->id=room->data.id;
newNode->room=room;
newNode->left=NULL;
newNode->right=NULL;
return newNode;
}
if(room->data.id<tree->id)
tree->left=insertTree(tree->left,room);
else if(room->data.id>tree->id)
tree->right=insertTree(tree->right,room);
return tree;
}

void displayTree(TreeNode*tree,int space){
if(tree==NULL)return;
space+=6;
displayTree(tree->right,space);
cout<<endl;
for(int i=6;i<space;i++)cout<<" ";
cout<<tree->id<<endl;
displayTree(tree->left,space);
}

void deleteTree(TreeNode*tree){
if(tree==NULL)return;
deleteTree(tree->left);
deleteTree(tree->right);
delete tree;
}

void saveToFile(){
ofstream file("rooms.txt");
if(!file){
cout<<"ERROR: Could not open rooms.txt for saving.\n";
return;
}
Node*temp=head;
while(temp!=NULL){
file<<temp->data.id<<" "
<<quoted(temp->data.location)<<" "
<<quoted(temp->data.owner)<<" "
<<temp->data.rent<<" "
<<temp->data.available<<"\n";
temp=temp->next;
}
file.close();
if(!file)cout<<"ERROR: Data could not be written properly.\n";
}

void loadFromFile(){
ifstream file("rooms.txt");
if(!file)return;
Room r;
while(file>>r.id>>quoted(r.location)>>quoted(r.owner)>>r.rent>>r.available){
if(r.id<=0||r.rent<=0||(r.available!=0&&r.available!=1))continue;
if(findById(r.id)!=NULL)continue;
Node*newNode=new Node;
newNode->data=r;
newNode->next=NULL;
if(head==NULL)head=newNode;
else{
Node*temp=head;
while(temp->next!=NULL)temp=temp->next;
temp->next=newNode;
}
root=insertTree(root,newNode);
}
file.close();
}

void showRoom(Room r){
cout<<"\nProperty ID: "<<r.id;
cout<<"\nLocation: "<<r.location;
cout<<"\nOwner: "<<r.owner;
cout<<"\nMonthly Rent: Rs. "<<r.rent;
cout<<"\nStatus: "<<(r.available==1?"Available":"Unavailable");
cout<<"\n-----------------------------\n";
}

vector<Room>getRooms(){
vector<Room>rooms;
Node*temp=head;
while(temp!=NULL){
rooms.push_back(temp->data);
temp=temp->next;
}
return rooms;
}

void sortByRent(vector<Room>&rooms){
for(int i=0;i<(int)rooms.size()-1;i++){
for(int j=0;j<(int)rooms.size()-i-1;j++){
if(rooms[j].rent>rooms[j+1].rent)
swap(rooms[j],rooms[j+1]);
}
}
}

void sortByLocation(vector<Room>&rooms){
for(int i=0;i<(int)rooms.size()-1;i++){
for(int j=0;j<(int)rooms.size()-i-1;j++){
if(rooms[j].location>rooms[j+1].location)
swap(rooms[j],rooms[j+1]);
}
}
}

public:
ManageRooms(){
head=NULL;
root=NULL;
loadFromFile();
}

~ManageRooms(){
saveToFile();
Node*temp=head;
while(temp!=NULL){
Node*nextNode=temp->next;
delete temp;
temp=nextNode;
}
deleteTree(root);
}

void addRoom(){
Room r;
cout<<"Enter Property ID: ";
if(!(cin>>r.id)||r.id<=0){
cout<<"Invalid ID.\n";
cin.clear();
cin.ignore(numeric_limits<streamsize>::max(),'\n');
return;
}
if(findById(r.id)!=NULL){
cout<<"This ID already exists.\n";
return;
}
cin.ignore(numeric_limits<streamsize>::max(),'\n');
cout<<"Enter location: ";
getline(cin,r.location);
cout<<"Enter owner name: ";
getline(cin,r.owner);
cout<<"Enter monthly rent: ";
if(!(cin>>r.rent)||r.rent<=0){
cout<<"Invalid rent.\n";
cin.clear();
cin.ignore(numeric_limits<streamsize>::max(),'\n');
return;
}
r.available=1;
Node*newNode=new Node;
newNode->data=r;
newNode->next=NULL;
if(head==NULL)head=newNode;
else{
Node*temp=head;
while(temp->next!=NULL)temp=temp->next;
temp->next=newNode;
}
root=insertTree(root,newNode);
saveToFile();
cout<<"Property added and saved successfully.\n";
}

void displayRooms(){
if(head==NULL){
cout<<"No properties listed.\n";
return;
}
Node*temp=head;
while(temp!=NULL){
showRoom(temp->data);
temp=temp->next;
}
}

void searchRoomById(){
int id;
cout<<"Enter Property ID to search: ";
if(!(cin>>id)){
cout<<"Invalid ID.\n";
cin.clear();
cin.ignore(numeric_limits<streamsize>::max(),'\n');
return;
}
Node*found=findById(id);
if(found==NULL)cout<<"Property not found.\n";
else showRoom(found->data);
}

void searchRoomByLocation(){
if(head==NULL){
cout<<"No properties available.\n";
return;
}
string location;
cin.ignore(numeric_limits<streamsize>::max(),'\n');
cout<<"Enter location: ";
getline(cin,location);
int found=0;
Node*temp=head;
while(temp!=NULL){
if(temp->data.location==location){
showRoom(temp->data);
found++;
}
temp=temp->next;
}
if(found==0)cout<<"No properties found at this location.\n";
}

void showRoomsWithinBudget(){
double budget;
cout<<"Enter maximum monthly budget: ";
if(!(cin>>budget)||budget<0){
cout<<"Invalid budget.\n";
cin.clear();
cin.ignore(numeric_limits<streamsize>::max(),'\n');
return;
}
int found=0;
Node*temp=head;
while(temp!=NULL){
if(temp->data.rent<=budget&&temp->data.available==1){
showRoom(temp->data);
found++;
}
temp=temp->next;
}
if(found==0)cout<<"No available properties within this budget.\n";
}

void changeAvailability(){
int id,status;
cout<<"Enter Property ID: ";
if(!(cin>>id)){
cout<<"Invalid ID.\n";
cin.clear();
cin.ignore(numeric_limits<streamsize>::max(),'\n');
return;
}
Node*room=findById(id);
if(room==NULL){
cout<<"Property not found.\n";
return;
}
cout<<"Enter 1 for available or 0 for unavailable: ";
if(!(cin>>status)||(status!=0&&status!=1)){
cout<<"Invalid status.\n";
cin.clear();
cin.ignore(numeric_limits<streamsize>::max(),'\n');
return;
}
room->data.available=status;
saveToFile();
cout<<"Availability updated and saved.\n";
}

void sortRoomsByRent(){
vector<Room>rooms=getRooms();
sortByRent(rooms);
if(rooms.empty()){
cout<<"No properties available.\n";
return;
}
cout<<"\nProperties sorted by rent:\n";
for(Room r:rooms)showRoom(r);
}

void sortRoomsByLocation(){
vector<Room>rooms=getRooms();
sortByLocation(rooms);
if(rooms.empty()){
cout<<"No properties available.\n";
return;
}
cout<<"\nProperties sorted by location:\n";
for(Room r:rooms)showRoom(r);
}

void showSearchTree(){
if(root==NULL){
cout<<"The search tree is empty.\n";
return;
}
cout<<"\nBinary Search Tree (Property IDs):\n";
displayTree(root,0);
cout<<"\n";
}

void showTotal(){
cout<<"Total properties: ";
int count=0;
Node*temp=head;
while(temp!=NULL){
count++;
temp=temp->next;
}
cout<<count<<"\n";
}
};

int main(){
ManageRooms app;
int choice;
do{
cout<<"\n========== RENT EASE ==========\n";
cout<<"1. Add Property\n";
cout<<"2. Display All Properties\n";
cout<<"3. Search Property by ID (BST)\n";
cout<<"4. Search Property by Location\n";
cout<<"5. Find Properties Within Budget\n";
cout<<"6. Change Property Availability\n";
cout<<"7. Sort Properties by Rent\n";
cout<<"8. Sort Properties by Location\n";
cout<<"9. Display Search Tree\n";
cout<<"10. Show Total Properties\n";
cout<<"11. Exit\n";
cout<<"Enter your choice: ";
if(!(cin>>choice)){
cout<<"Invalid input. Enter a number.\n";
cin.clear();
cin.ignore(numeric_limits<streamsize>::max(),'\n');
continue;
}
switch(choice){
case 1:app.addRoom();break;
case 2:app.displayRooms();break;
case 3:app.searchRoomById();break;
case 4:app.searchRoomByLocation();break;
case 5:app.showRoomsWithinBudget();break;
case 6:app.changeAvailability();break;
case 7:app.sortRoomsByRent();break;
case 8:app.sortRoomsByLocation();break;
case 9:app.showSearchTree();break;
case 10:app.showTotal();break;
case 11:cout<<"Thank you for using Rent Ease!\n";break;
default:cout<<"Invalid choice.\n";
}
}while(choice!=11);
return 0;
}
