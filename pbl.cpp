
#include<iostream>
#include<string>
#include<fstream>
#include<vector>
#include<queue>
#include<sstream>
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

struct CompareRent{
bool operator()(const Room&a,const Room&b)const{
if(a.rent==b.rent)return a.id>b.id;
return a.rent>b.rent;
}
};

class ManageRooms{
private:
Node*head;
TreeNode*root;
vector<string>locations;
vector<vector<pair<int,double>>>graph;

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

int getLocationIndex(string location){
for(int i=0;i<(int)locations.size();i++){
if(locations[i]==location)return i;
}
return -1;
}

int addLocation(string location){
int index=getLocationIndex(location);
if(index!=-1)return index;
locations.push_back(location);
graph.push_back(vector<pair<int,double>>());
return (int)locations.size()-1;
}

void addEdge(int source,int destination,double distance){
bool found=false;
for(auto&edge:graph[source]){
if(edge.first==destination){
edge.second=distance;
found=true;
break;
}
}
if(!found)graph[source].push_back({destination,distance});

found=false;
for(auto&edge:graph[destination]){
if(edge.first==source){
edge.second=distance;
found=true;
break;
}
}
if(!found)graph[destination].push_back({source,distance});
}

void saveToFile(){
ofstream file("rooms.txt");
if(!file){
cout<<"Unable to save room records.\n";
return;
}
Node*temp=head;
while(temp!=NULL){
file<<temp->data.id<<"|"
<<temp->data.location<<"|"
<<temp->data.owner<<"|"
<<temp->data.rent<<"|"
<<temp->data.available<<"\n";
temp=temp->next;
}
file.close();
}

void loadFromFile(){
ifstream file("rooms.txt");
if(!file)return;
string line;
while(getline(file,line)){
stringstream ss(line);
string idText,location,owner,rentText,availableText;
getline(ss,idText,'|');
getline(ss,location,'|');
getline(ss,owner,'|');
getline(ss,rentText,'|');
getline(ss,availableText,'|');
try{
Room r;
r.id=stoi(idText);
r.location=location;
r.owner=owner;
r.rent=stod(rentText);
r.available=stoi(availableText);
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
addLocation(r.location);
}
catch(...){
continue;
}
}
file.close();
}

void saveGraphToFile(){
ofstream file("routes.txt");
if(!file){
cout<<"Unable to save graph connections.\n";
return;
}
for(int i=0;i<(int)graph.size();i++){
for(auto edge:graph[i]){
if(i<edge.first){
file<<locations[i]<<"|"
<<locations[edge.first]<<"|"
<<edge.second<<"\n";
}
}
}
file.close();
}

void loadGraphFromFile(){
ifstream file("routes.txt");
if(!file)return;
string line;
while(getline(file,line)){
stringstream ss(line);
string source,destination,distanceText;
getline(ss,source,'|');
getline(ss,destination,'|');
getline(ss,distanceText,'|');
try{
double distance=stod(distanceText);
if(distance<=0||source.empty()||destination.empty())continue;
int a=addLocation(source);
int b=addLocation(destination);
if(a!=b)addEdge(a,b,distance);
}
catch(...){
continue;
}
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
loadGraphFromFile();
}

~ManageRooms(){
saveToFile();
saveGraphToFile();
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
cin.ignore(10000,'\n');
return;
}
if(findById(r.id)!=NULL){
cout<<"This ID already exists.\n";
return;
}
cin.ignore(10000,'\n');
cout<<"Enter location: ";
getline(cin,r.location);
if(r.location.empty()||r.location.find('|')!=string::npos){
cout<<"Invalid location.\n";
return;
}
cout<<"Enter owner name: ";
getline(cin,r.owner);
if(r.owner.empty()||r.owner.find('|')!=string::npos){
cout<<"Invalid owner name.\n";
return;
}
cout<<"Enter monthly rent: ";
if(!(cin>>r.rent)||r.rent<=0){
cout<<"Invalid rent.\n";
cin.clear();
cin.ignore(10000,'\n');
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
addLocation(r.location);
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
cin.ignore(10000,'\n');
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
cin.ignore(10000,'\n');
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
cin.ignore(10000,'\n');
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

void showRoomsWithinRentRange(){
double minRent,maxRent;
cout<<"Enter minimum monthly rent: ";
if(!(cin>>minRent)||minRent<0){
cout<<"Invalid minimum rent.\n";
cin.clear();
cin.ignore(10000,'\n');
return;
}
cout<<"Enter maximum monthly rent: ";
if(!(cin>>maxRent)||maxRent<minRent){
cout<<"Invalid maximum rent.\n";
cin.clear();
cin.ignore(10000,'\n');
return;
}
int found=0;
Node*temp=head;
while(temp!=NULL){
if(temp->data.rent>=minRent&&temp->data.rent<=maxRent&&temp->data.available==1){
showRoom(temp->data);
found++;
}
temp=temp->next;
}
if(found==0)cout<<"No available properties found in this rent range.\n";
}

void changeAvailability(){
int id,status;
cout<<"Enter Property ID: ";
if(!(cin>>id)){
cout<<"Invalid ID.\n";
cin.clear();
cin.ignore(10000,'\n');
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
cin.ignore(10000,'\n');
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
int count=0;
Node*temp=head;
while(temp!=NULL){
count++;
temp=temp->next;
}
cout<<"Total properties: "<<count<<"\n";
}

void showPriorityProperties(){
priority_queue<Room,vector<Room>,CompareRent>pq;
Node*temp=head;
while(temp!=NULL){
if(temp->data.available==1)pq.push(temp->data);
temp=temp->next;
}
if(pq.empty()){
cout<<"No available properties to recommend.\n";
return;
}
cout<<"\nAvailable Properties (Lowest Rent First):\n";
while(!pq.empty()){
showRoom(pq.top());
pq.pop();
}
}

void addGraphConnection(){
string source,destination;
double distance;
cin.ignore(10000,'\n');
cout<<"Enter starting location: ";
getline(cin,source);
cout<<"Enter destination location: ";
getline(cin,destination);
if(source.empty()||destination.empty()||source==destination||
source.find('|')!=string::npos||destination.find('|')!=string::npos){
cout<<"Invalid locations.\n";
return;
}
cout<<"Enter distance between locations in km: ";
if(!(cin>>distance)||distance<=0){
cout<<"Invalid distance.\n";
cin.clear();
cin.ignore(10000,'\n');
return;
}
int a=addLocation(source);
int b=addLocation(destination);
addEdge(a,b,distance);
saveGraphToFile();
cout<<"Location connection added and saved.\n";
}

void displayGraph(){
if(locations.empty()){
cout<<"Graph is empty.\n";
return;
}
cout<<"\nLOCATION GRAPH (ADJACENCY LIST)\n";
for(int i=0;i<(int)locations.size();i++){
cout<<locations[i]<<" -> ";
if(graph[i].empty()){
cout<<"No connections";
}
else{
for(auto edge:graph[i]){
cout<<locations[edge.first]<<" ("<<edge.second<<" km) ";
}
}
cout<<"\n";
}
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
cout<<"6. Find Properties Within Rent Range\n";
cout<<"7. Change Property Availability\n";
cout<<"8. Sort Properties by Rent\n";
cout<<"9. Sort Properties by Location\n";
cout<<"10. Display Search Tree\n";
cout<<"11. Show Total Properties\n";
cout<<"12. Recommend Properties (Priority Queue)\n";
cout<<"13. Add Location Connection (Graph)\n";
cout<<"14. Display Location Graph\n";
cout<<"15. Exit\n";
cout<<"Enter your choice: ";
if(!(cin>>choice)){
cout<<"Invalid input. Enter a number.\n";
cin.clear();
cin.ignore(10000,'\n');
continue;
}
switch(choice){
case 1:app.addRoom();break;
case 2:app.displayRooms();break;
case 3:app.searchRoomById();break;
case 4:app.searchRoomByLocation();break;
case 5:app.showRoomsWithinBudget();break;
case 6:app.showRoomsWithinRentRange();break;
case 7:app.changeAvailability();break;
case 8:app.sortRoomsByRent();break;
case 9:app.sortRoomsByLocation();break;
case 10:app.showSearchTree();break;
case 11:app.showTotal();break;
case 12:app.showPriorityProperties();break;
case 13:app.addGraphConnection();break;
case 14:app.displayGraph();break;
case 15:cout<<"Thank you for using Rent Ease!\n";break;
default:cout<<"Invalid choice.\n";
}
}while(choice!=15);
return 0;
}
