// Swish Mock Data
// This file contains all mock data for the frontend prototype
// This will be replaced with API calls when backend is connected

export const mockUsers = [
  {
    id: 1,
    name: 'Priya Sharma',
    username: 'priya_s',
    email: 'priya.sharma@campus.edu',
    avatar: 'https://i.pravatar.cc/150?img=1',
    department: 'Computer Science',
    year: '3rd Year',
    bio: 'Passionate about AI and machine learning. Building cool stuff 💻✨',
    followers: 1234,
    following: 567,
    postsCount: 89,
    isFollowing: false,
    isVerified: true,
    joinedDate: '2023-09-01'
  },
  {
    id: 2,
    name: 'Rahul Kumar',
    username: 'rahul_k',
    email: 'rahul.kumar@campus.edu',
    avatar: 'https://i.pravatar.cc/150?img=2',
    department: 'Electrical Engineering',
    year: '4th Year',
    bio: '⚡ Electronics enthusiast | Robotics team lead',
    followers: 892,
    following: 345,
    postsCount: 67,
    isFollowing: true,
    isVerified: false,
    joinedDate: '2022-09-01'
  },
  {
    id: 3,
    name: 'Ananya Patel',
    username: 'ananya_p',
    email: 'ananya.patel@campus.edu',
    avatar: 'https://i.pravatar.cc/150?img=3',
    department: 'Mechanical Engineering',
    year: '2nd Year',
    bio: '🚀 Car racing enthusiast | ASME member',
    followers: 567,
    following: 234,
    postsCount: 45,
    isFollowing: false,
    isVerified: false,
    joinedDate: '2024-09-01'
  },
  {
    id: 4,
    name: 'Vikram Singh',
    username: 'vikram_s',
    email: 'vikram.singh@campus.edu',
    avatar: 'https://i.pravatar.cc/150?img=4',
    department: 'Business Administration',
    year: '3rd Year',
    bio: '📈 Finance & Marketing | Entrepreneurship cell',
    followers: 2345,
    following: 890,
    postsCount: 156,
    isFollowing: true,
    isVerified: true,
    joinedDate: '2023-09-01'
  },
  {
    id: 5,
    name: 'Sneha Gupta',
    username: 'sneha_g',
    email: 'sneha.gupta@campus.edu',
    avatar: 'https://i.pravatar.cc/150?img=5',
    department: 'Biotechnology',
    year: '4th Year',
    bio: '🔬 Research enthusiast | Environmental activist',
    followers: 678,
    following: 321,
    postsCount: 78,
    isFollowing: false,
    isVerified: false,
    joinedDate: '2022-09-01'
  },
  {
    id: 6,
    name: 'Arjun Mehta',
    username: 'arjun_m',
    email: 'arjun.mehta@campus.edu',
    avatar: 'https://i.pravatar.cc/150?img=6',
    department: 'Civil Engineering',
    year: '2nd Year',
    bio: '🏗️ Infrastructure development | Cricket team captain',
    followers: 445,
    following: 178,
    postsCount: 34,
    isFollowing: false,
    isVerified: false,
    joinedDate: '2024-09-01'
  },
  {
    id: 7,
    name: 'Kavita Reddy',
    username: 'kavita_r',
    email: 'kavita.reddy@campus.edu',
    avatar: 'https://i.pravatar.cc/150?img=7',
    department: 'Chemical Engineering',
    year: '3rd Year',
    bio: '⚗️ Sustainable chemistry | Dance club president',
    followers: 789,
    following: 456,
    postsCount: 92,
    isFollowing: true,
    isVerified: false,
    joinedDate: '2023-09-01'
  },
  {
    id: 8,
    name: 'Nikhil Joshi',
    username: 'nikhil_j',
    email: 'nikhil.joshi@campus.edu',
    avatar: 'https://i.pravatar.cc/150?img=8',
    department: 'Information Technology',
    year: '4th Year',
    bio: '💻 Full stack developer | Hackathon winner',
    followers: 1567,
    following: 678,
    postsCount: 112,
    isFollowing: true,
    isVerified: true,
    joinedDate: '2022-09-01'
  }
];

export const mockPosts = [
  {
    id: 1,
    user: mockUsers[0],
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
    caption: 'Just finished our hackathon project! 🎉 Team #SwishDevelopers built an AI-powered study assistant. Thanks to everyone who supported us! #hackathon #AI #campuslife',
    likes: 234,
    comments: 45,
    shares: 12,
    isLiked: false,
    isSaved: false,
    timestamp: '2 hours ago',
    location: 'Tech Fest 2024'
  },
  {
    id: 2,
    user: mockUsers[1],
    image: 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?w=800',
    caption: 'Robotics team update: Our autonomous robot successfully navigated the maze! 🤖 Hard work paying off. #robotics #engineering #innovation',
    likes: 189,
    comments: 32,
    shares: 8,
    isLiked: true,
    isSaved: false,
    timestamp: '5 hours ago',
    location: 'Robotics Lab'
  },
  {
    id: 3,
    user: mockUsers[3],
    image: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800',
    caption: 'Great turnout at today\'s entrepreneurship workshop! 📈 Learned so much about startup funding and pitch decks. Thanks to our guest speakers! #entrepreneurship #business #networking',
    likes: 312,
    comments: 67,
    shares: 23,
    isLiked: false,
    isSaved: true,
    timestamp: '1 day ago',
    location: 'Business School Auditorium'
  },
  {
    id: 4,
    user: mockUsers[2],
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    caption: 'Formula Student racing team practice day! 🏎️ Our car is looking great for the upcoming competition. Come support us at the regional finals! #racing #engineering #formulastudent',
    likes: 456,
    comments: 89,
    shares: 34,
    isLiked: true,
    isSaved: false,
    timestamp: '2 days ago',
    location: 'Racing Track'
  },
  {
    id: 5,
    user: mockUsers[4],
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800',
    caption: 'Research breakthrough in sustainable bioplastics! 🌱 Our team just published our findings. Excited to contribute to environmental solutions. #research #sustainability #biotechnology',
    likes: 278,
    comments: 56,
    shares: 45,
    isLiked: false,
    isSaved: false,
    timestamp: '3 days ago',
    location: 'Research Lab'
  },
  {
    id: 6,
    user: mockUsers[7],
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
    caption: 'Won first place at the national coding competition! 🏆 48 hours of intense coding but totally worth it. Thanks to my amazing team! #coding #programming #hackathon',
    likes: 567,
    comments: 123,
    shares: 67,
    isLiked: true,
    isSaved: true,
    timestamp: '4 days ago',
    location: 'National Tech Summit'
  },
  {
    id: 7,
    user: mockUsers[5],
    image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800',
    caption: 'Inter-department cricket tournament finals! 🏏 What an amazing match. Sportsmanship at its best. Congrats to the Mechanical Engineering team! #sports #cricket #campuslife',
    likes: 389,
    comments: 78,
    shares: 23,
    isLiked: false,
    isSaved: false,
    timestamp: '5 days ago',
    location: 'Sports Complex'
  },
  {
    id: 8,
    user: mockUsers[6],
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800',
    caption: 'Annual cultural festival flash mob! 💃 Dance club bringing energy to the campus. Thanks to everyone who participated! #dance #culture #festival',
    likes: 445,
    comments: 92,
    shares: 56,
    isLiked: true,
    isSaved: false,
    timestamp: '1 week ago',
    location: 'Main Campus Ground'
  }
];

export const mockNotifications = [
  {
    id: 1,
    type: 'like',
    user: mockUsers[1],
    post: mockPosts[0],
    message: 'liked your post',
    timestamp: '5 minutes ago',
    isRead: false
  },
  {
    id: 2,
    type: 'comment',
    user: mockUsers[3],
    post: mockPosts[0],
    message: 'commented: "Amazing work! Keep it up!"',
    timestamp: '15 minutes ago',
    isRead: false
  },
  {
    id: 3,
    type: 'follow',
    user: mockUsers[2],
    message: 'started following you',
    timestamp: '1 hour ago',
    isRead: false
  },
  {
    id: 4,
    type: 'like',
    user: mockUsers[4],
    post: mockPosts[1],
    message: 'liked your post',
    timestamp: '2 hours ago',
    isRead: true
  },
  {
    id: 5,
    type: 'comment',
    user: mockUsers[5],
    post: mockPosts[1],
    message: 'commented: "This is incredible!"',
    timestamp: '3 hours ago',
    isRead: true
  },
  {
    id: 6,
    type: 'follow',
    user: mockUsers[6],
    message: 'started following you',
    timestamp: '5 hours ago',
    isRead: true
  },
  {
    id: 7,
    type: 'share',
    user: mockUsers[7],
    post: mockPosts[2],
    message: 'shared your post',
    timestamp: '1 day ago',
    isRead: true
  },
  {
    id: 8,
    type: 'mention',
    user: mockUsers[0],
    post: mockPosts[3],
    message: 'mentioned you in a comment',
    timestamp: '2 days ago',
    isRead: true
  }
];

export const mockComments = [
  {
    id: 1,
    postId: 1,
    user: mockUsers[1],
    text: 'This is amazing! Great work team 🔥',
    timestamp: '1 hour ago',
    likes: 12
  },
  {
    id: 2,
    postId: 1,
    user: mockUsers[3],
    text: 'Congratulations! When can we see the demo?',
    timestamp: '45 minutes ago',
    likes: 8
  },
  {
    id: 3,
    postId: 1,
    user: mockUsers[2],
    text: 'The AI features look really impressive!',
    timestamp: '30 minutes ago',
    likes: 5
  }
];

export const mockCategories = [
  { id: 1, name: 'Technology', icon: '💻', postCount: 234 },
  { id: 2, name: 'Sports', icon: '🏆', postCount: 189 },
  { id: 3, name: 'Arts & Culture', icon: '🎨', postCount: 156 },
  { id: 4, name: 'Academic', icon: '📚', postCount: 345 },
  { id: 5, name: 'Events', icon: '🎉', postCount: 267 },
  { id: 6, name: 'Clubs', icon: '👥', postCount: 123 },
  { id: 7, name: 'Research', icon: '🔬', postCount: 89 },
  { id: 8, name: 'Campus Life', icon: '🏫', postCount: 412 }
];

export const mockDepartments = [
  'Computer Science',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Biotechnology',
  'Information Technology',
  'Business Administration',
  'Physics',
  'Chemistry',
  'Mathematics',
  'Environmental Science'
];

export const mockYears = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  '5th Year',
  'Graduate',
  'PhD'
];

export const mockAdminStats = {
  totalUsers: 2456,
  totalPosts: 12456,
  activeUsers: 1890,
  reportedPosts: 23,
  newUsersToday: 45,
  newPostsToday: 123
};

export const mockEvents = [
  {
    id: 1,
    title: 'Campus Hackathon 2024',
    date: '2024-09-15',
    time: '9:00 AM - 6:00 PM',
    location: 'Tech Building, Auditorium',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
    description: '24-hour hackathon to build innovative solutions for campus problems',
    attendees: [
      { name: 'Priya Sharma', avatar: 'https://i.pravatar.cc/150?img=1' },
      { name: 'Rahul Kumar', avatar: 'https://i.pravatar.cc/150?img=2' },
      { name: 'Ananya Patel', avatar: 'https://i.pravatar.cc/150?img=3' }
    ],
    attendeeCount: 156,
    isJoined: false,
    isInterested: true,
    organizer: 'Tech Club'
  },
  {
    id: 2,
    title: 'Career Fair 2024',
    date: '2024-09-20',
    time: '10:00 AM - 4:00 PM',
    location: 'Main Campus Ground',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    description: 'Meet top recruiters and explore career opportunities',
    attendees: [
      { name: 'Vikram Singh', avatar: 'https://i.pravatar.cc/150?img=4' },
      { name: 'Sneha Gupta', avatar: 'https://i.pravatar.cc/150?img=5' }
    ],
    attendeeCount: 234,
    isJoined: true,
    isInterested: false,
    organizer: 'Placement Cell'
  },
  {
    id: 3,
    title: 'Music Festival',
    date: '2024-09-25',
    time: '6:00 PM - 11:00 PM',
    location: 'Open Air Theater',
    image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800',
    description: 'Annual music festival featuring student bands and guest artists',
    attendees: [
      { name: 'Arjun Mehta', avatar: 'https://i.pravatar.cc/150?img=6' },
      { name: 'Kavita Reddy', avatar: 'https://i.pravatar.cc/150?img=7' }
    ],
    attendeeCount: 445,
    isJoined: false,
    isInterested: false,
    organizer: 'Cultural Committee'
  },
  {
    id: 4,
    title: 'Alumni Networking Event',
    date: '2024-10-01',
    time: '5:00 PM - 8:00 PM',
    location: 'Business School',
    image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800',
    description: 'Connect with successful alumni and explore mentorship opportunities',
    attendees: [
      { name: 'Nikhil Joshi', avatar: 'https://i.pravatar.cc/150?img=8' }
    ],
    attendeeCount: 89,
    isJoined: false,
    isInterested: true,
    organizer: 'Alumni Association'
  }
];

export const mockReportedPosts = [
  {
    id: 1,
    post: mockPosts[2],
    reportedBy: mockUsers[5],
    reason: 'Inappropriate content',
    timestamp: '1 day ago',
    status: 'pending'
  },
  {
    id: 2,
    post: mockPosts[5],
    reportedBy: mockUsers[6],
    reason: 'Spam',
    timestamp: '2 days ago',
    status: 'under_review'
  },
  {
    id: 3,
    post: mockPosts[7],
    reportedBy: mockUsers[0],
    reason: 'Copyright violation',
    timestamp: '3 days ago',
    status: 'resolved'
  }
];

export const mockCurrentUser = {
  id: 1,
  name: 'Priya Sharma',
  username: 'priya_s',
  email: 'priya.sharma@campus.edu',
  avatar: 'https://i.pravatar.cc/150?img=1',
  department: 'Computer Science',
  year: '3rd Year',
  bio: 'Passionate about AI and machine learning. Building cool stuff 💻✨',
  followers: 1234,
  following: 567,
  postsCount: 89,
  isFollowing: false,
  isVerified: true,
  joinedDate: '2023-09-01'
};

// Helper functions for mock data operations
export const getUserById = (id) => mockUsers.find(user => user.id === id);
export const getPostById = (id) => mockPosts.find(post => post.id === id);
export const getPostsByUserId = (userId) => mockPosts.filter(post => post.user.id === userId);
export const getNotificationsByUserId = (userId) => mockNotifications.filter(notif => notif.userId === userId);
export const getCommentsByPostId = (postId) => mockComments.filter(comment => comment.postId === postId);