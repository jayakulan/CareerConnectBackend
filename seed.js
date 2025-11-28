import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import User from './models/User.js';
import SeekerProfile from './models/SeekerProfile.js';
import CompanyProfile from './models/CompanyProfile.js';

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

const seedUsers = async () => {
    try {
        await connectDB();

        console.log('Creating test users...\n');

        // Check if seeker already exists
        let seeker = await User.findOne({ email: 'seeker@gmail.com' });

        if (!seeker) {
            // Create Job Seeker User first
            seeker = await User.create({
                name: 'Job Seeker',
                email: 'seeker@gmail.com',
                password: 'seeker',
                role: 'seeker',
                isVerified: true,
            });

            // Create Seeker Profile linked to user
            const seekerProfile = await SeekerProfile.create({
                user: seeker._id,
                headline: 'Full Stack Developer',
                bio: 'Passionate full-stack developer with 5+ years of experience',
                location: 'San Francisco, CA',
                skills: ['React', 'Node.js', 'MongoDB', 'JavaScript', 'TypeScript'],
                experience: [
                    {
                        title: 'Senior Developer',
                        company: 'TechCorp',
                        location: 'San Francisco, CA',
                        startDate: new Date('2021-01-01'),
                        current: true,
                        description: 'Leading development of enterprise applications',
                    },
                ],
                education: [
                    {
                        institution: 'University of California',
                        degree: 'Bachelor of Science',
                        field: 'Computer Science',
                        startYear: 2015,
                        endYear: 2019,
                    },
                ],
            });

            // Update seeker with profile reference
            seeker.profile = seekerProfile._id;
            seeker.profileModel = 'SeekerProfile';
            await seeker.save();

            console.log('✅ Seeker user created:');
            console.log('   Email: seeker@gmail.com');
            console.log('   Password: seeker');
            console.log('   Role: seeker\n');
        } else {
            console.log('ℹ️  Seeker user already exists (seeker@gmail.com)\n');
        }

        // Check if company already exists
        let company = await User.findOne({ email: 'company@gmail.com' });

        if (!company) {
            // Create Company User first
            company = await User.create({
                name: 'TechCorp Recruiter',
                email: 'company@gmail.com',
                password: 'company',
                role: 'company',
                isVerified: true,
            });

            // Create Company Profile linked to user
            const companyProfile = await CompanyProfile.create({
                user: company._id,
                companyName: 'TechCorp Inc.',
                description: 'Leading technology company specializing in innovative solutions',
                website: 'https://techcorp.com',
                industry: 'Technology',
                companySize: '201-500',
                founded: 2010,
                location: {
                    address: '123 Tech Street',
                    city: 'San Francisco',
                    state: 'CA',
                    country: 'USA',
                    zipCode: '94105',
                },
                contact: {
                    email: 'contact@techcorp.com',
                    phone: '+1 (555) 123-4567',
                },
                isVerified: true,
            });

            // Update company with profile reference
            company.profile = companyProfile._id;
            company.profileModel = 'CompanyProfile';
            await company.save();

            console.log('✅ Company user created:');
            console.log('   Email: company@gmail.com');
            console.log('   Password: company');
            console.log('   Role: company\n');
        } else {
            console.log('ℹ️  Company user already exists (company@gmail.com)\n');
        }

        // Check if admin already exists
        let admin = await User.findOne({ email: 'admin@gmail.com' });

        if (!admin) {
            // Create Admin User
            admin = await User.create({
                name: 'Admin User',
                email: 'admin@gmail.com',
                password: 'admin',
                role: 'admin',
                isVerified: true,
            });

            console.log('✅ Admin user created:');
            console.log('   Email: admin@gmail.com');
            console.log('   Password: admin');
            console.log('   Role: admin\n');
        } else {
            console.log('ℹ️  Admin user already exists (admin@gmail.com)\n');
        }

        console.log('🎉 Database seeded successfully!');
        console.log('\nYou can now login with:');
        console.log('  Seeker: seeker@gmail.com / seeker');
        console.log('  Company: company@gmail.com / company');
        console.log('  Admin: admin@gmail.com / admin');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error.message);
        console.error(error);
        fs.writeFileSync('seed_error.log', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        process.exit(1);
    }
};

seedUsers();
